const { Resend } = require('resend');
const { setOtp } = require('../Services/OtpService');
const crypto = require('crypto');

// HTTPS-based mailer (Resend). Replaced nodemailer/Gmail SMTP because
// Render's free tier blocks outbound SMTP at the egress firewall.
// Sandbox sender works without a verified domain; override via MAIL_FROM
// once you have one verified in the Resend dashboard.
const SANDBOX_SENDER = 'Trendy Treasures <onboarding@resend.dev>';

let cachedClient = null;
const getClient = () => {
    if (!cachedClient) {
        cachedClient = new Resend(process.env.RESEND_API_KEY);
    }
    return cachedClient;
};

// Sends a 4-digit OTP for email verification at signup. The OTP is stored in
// the otps collection with purpose='signup' (TTL 2 minutes via the model's
// `expires` setting). Returns { success, message, error? }.
async function sendMail(email) {
    try {
        if (!process.env.RESEND_API_KEY) {
            return {
                success: false,
                message: 'Email is not configured on the server. Set RESEND_API_KEY.',
            };
        }

        const otp = crypto.randomInt(1000, 10000);

        await setOtp(email, otp, 'signup');

        const { error } = await getClient().emails.send({
            from: process.env.MAIL_FROM || SANDBOX_SENDER,
            to: email,
            subject: 'Verify your Trendy Treasures email',
            text: `Welcome to Trendy Treasures! Your email-verification code is ${otp}. This code expires in 2 minutes.`,
        });

        if (error) {
            return {
                success: false,
                message: 'Failed to send verification email',
                error: error.message || error.name,
            };
        }

        return {
            success: true,
            message: 'Verification email sent',
        };
    } catch (error) {
        return {
            success: false,
            message: 'Failed to send verification email',
            error: error.message,
        };
    }
}

module.exports = sendMail;
