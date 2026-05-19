const { setOtp } = require('../Services/OtpService');
const { sendBrevoMail } = require('./_brevoMail');
const crypto = require('crypto');

// Sends a 4-digit OTP for email verification at signup. The OTP is stored in
// the otps collection with purpose='signup' (TTL 2 minutes via the model's
// `expires` setting). Returns { success, message, error? }.
async function sendMail(email) {
    try {
        const otp = crypto.randomInt(1000, 10000);

        await setOtp(email, otp, 'signup');

        await sendBrevoMail({
            to: email,
            subject: 'Verify your Trendy Treasures email',
            text: `Welcome to Trendy Treasures! Your email-verification code is ${otp}. This code expires in 2 minutes.`,
        });

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
