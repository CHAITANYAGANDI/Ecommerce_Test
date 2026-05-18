const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { setOtp, isInResendCooldown } = require('./OtpService');

const buildTransport = () =>
    nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,
        auth: {
            user: process.env.MAIL_ADDRESS,
            pass: process.env.MAIL_PASSWORD
        }
    });

async function sendPasswordResetOtp(email) {
    try {
        if (!process.env.MAIL_ADDRESS || !process.env.MAIL_PASSWORD) {
            return {
                success: false,
                message: 'Email is not configured on the server. Set MAIL_ADDRESS and MAIL_PASSWORD.'
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

        await buildTransport().sendMail({
            from: process.env.MAIL_ADDRESS,
            to: email,
            subject: 'AuthShield password reset code',
            text:
                `Your AuthShield password-reset code is ${otp}. ` +
                `It expires in 10 minutes. ` +
                `If you didn't request this, you can safely ignore this email.`
        });

        return { success: true, message: 'Verification email sent' };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('sendPasswordResetOtp error:', error.message);
        return {
            success: false,
            message: 'Failed to send reset email',
            error: error.message
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
        if (!process.env.MAIL_ADDRESS || !process.env.MAIL_PASSWORD) {
            return {
                success: false,
                message: 'Email is not configured on the server. Set MAIL_ADDRESS and MAIL_PASSWORD.'
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

        await buildTransport().sendMail({
            from: process.env.MAIL_ADDRESS,
            to: email,
            subject: 'AuthShield email verification code',
            text:
                `Your AuthShield email-verification code is ${otp}. ` +
                `It expires in 10 minutes. ` +
                `If you didn't try to create an AuthShield account, you can safely ignore this email.`
        });

        return { success: true, message: 'Verification email sent' };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('sendSignupOtp error:', error.message);
        return {
            success: false,
            message: 'Failed to send verification email',
            error: error.message
        };
    }
}

module.exports = { sendPasswordResetOtp, sendSignupOtp };
