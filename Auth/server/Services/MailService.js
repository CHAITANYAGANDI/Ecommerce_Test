const axios = require('axios');
const crypto = require('crypto');
const { setOtp, isInResendCooldown } = require('./OtpService');

// HTTPS-based mailer (Brevo). Replaced Resend because Resend requires a
// verified domain to send to recipients other than the account owner —
// for a class project we don't have a real domain to add DNS records to.
// Brevo's free tier (300/day) lets you verify a single sender email
// address by clicking a link, then send FROM that address TO anyone, no
// DNS control needed. Render's free tier still blocks SMTP, so we use
// Brevo's REST API over HTTPS.
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Accept "Name <email>" or bare "email" in MAIL_FROM. Brevo's API takes
// sender as a structured { name, email } object — split it here.
const parseSender = (raw) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) return { name: match[1].trim(), email: match[2].trim() };
    return { name: trimmed, email: trimmed };
};

const sendViaBrevo = async ({ to, subject, text }) => {
    const sender = parseSender(process.env.MAIL_FROM);
    if (!sender) {
        const err = new Error('MAIL_FROM not configured');
        err.expected = true;
        throw err;
    }
    await axios.post(
        BREVO_ENDPOINT,
        {
            sender,
            to: [{ email: to }],
            subject,
            textContent: text
        },
        {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json',
                'accept': 'application/json'
            },
            timeout: 10000
        }
    );
};

async function sendPasswordResetOtp(email) {
    try {
        if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
            return {
                success: false,
                message: 'Email is not configured on the server. Set BREVO_API_KEY and MAIL_FROM.'
            };
        }

        // Refuse to spam the mailbox — even if the rate limiter let the
        // request through, we honor a per-address cooldown so an attacker
        // can't grief a user by repeated resets.
        if (await isInResendCooldown(email, 'recovery')) {
            // Caller treats this as success-shaped (we don't want to leak
            // mailbox state to forgot-password callers) so just no-op.
            return { success: true, message: 'Cooldown — previous code still valid' };
        }

        const otp = crypto.randomInt(100000, 1000000);
        await setOtp(email, otp, 'recovery');

        await sendViaBrevo({
            to: email,
            subject: 'AuthShield password reset code',
            text:
                `Your AuthShield password-reset code is ${otp}. ` +
                `It expires in 10 minutes. ` +
                `If you didn't request this, you can safely ignore this email.`
        });

        return { success: true, message: 'Verification email sent' };
    } catch (error) {
        // Brevo errors come back as axios responses — surface the API
        // message (e.g. "unauthorized", "sender_not_valid") so a misconfig
        // shows up in the logs instead of just "Request failed with 401".
        const apiMessage = error.response && error.response.data && error.response.data.message;
        // eslint-disable-next-line no-console
        console.error('sendPasswordResetOtp error:', apiMessage || error.message);
        return {
            success: false,
            message: 'Failed to send reset email',
            error: apiMessage || error.message
        };
    }
}

// Signup verification — caller is ClientRegisterController, which has already
// rejected duplicate accounts and stashed the pending profile in a JWT cookie.
// Unlike the recovery path, signup mails are addressed to a brand-new user, so
// failure to send IS surfaced as an error (the caller refuses to set the
// pendingSignup cookie if we return success:false).
async function sendSignupOtp(email) {
    try {
        if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
            return {
                success: false,
                message: 'Email is not configured on the server. Set BREVO_API_KEY and MAIL_FROM.'
            };
        }

        // Same per-address resend throttle as the recovery path — an
        // attacker who knows a victim is mid-signup shouldn't be able to
        // mailbomb them by spamming /register with the victim's email.
        if (await isInResendCooldown(email, 'signup')) {
            return { success: true, message: 'Cooldown — previous code still valid' };
        }

        const otp = crypto.randomInt(100000, 1000000);
        await setOtp(email, otp, 'signup');

        await sendViaBrevo({
            to: email,
            subject: 'AuthShield email verification code',
            text:
                `Your AuthShield email-verification code is ${otp}. ` +
                `It expires in 10 minutes. ` +
                `If you didn't try to create an AuthShield account, you can safely ignore this email.`
        });

        return { success: true, message: 'Verification email sent' };
    } catch (error) {
        const apiMessage = error.response && error.response.data && error.response.data.message;
        // eslint-disable-next-line no-console
        console.error('sendSignupOtp error:', apiMessage || error.message);
        return {
            success: false,
            message: 'Failed to send verification email',
            error: apiMessage || error.message
        };
    }
}

module.exports = { sendPasswordResetOtp, sendSignupOtp };
