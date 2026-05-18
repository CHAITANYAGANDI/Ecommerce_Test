const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { setOtp, isInResendCooldown } = require('./OtpService');

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
        if (await isInResendCooldown(email)) {
            // Caller treats this as success-shaped (we don't want to leak
            // mailbox state to forgot-password callers) so just no-op.
            return { success: true, message: 'Cooldown — previous code still valid' };
        }

        const otp = crypto.randomInt(100000, 1000000);
        await setOtp(email, otp, 'recovery');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_ADDRESS,
                pass: process.env.MAIL_PASSWORD
            }
        });

        await transporter.sendMail({
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

module.exports = { sendPasswordResetOtp };
