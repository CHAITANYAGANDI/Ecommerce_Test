const nodemailer = require('nodemailer');
const { setOtp } = require('../Services/OtpService');
const crypto = require('crypto');

// Sends a 4-digit OTP for email verification at signup. The OTP is stored in
// the otps collection with purpose='signup' (TTL 2 minutes via the model's
// `expires` setting). Returns { success, message, error? }.
async function sendMail(email) {
    try {
        const otp = crypto.randomInt(1000, 10000);

        await setOtp(email, otp, 'signup');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_ADDRESS,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.MAIL_ADDRESS,
            to: email,
            subject: 'Verify your Trendy Treasures email',
            text: `Welcome to Trendy Treasures! Your email-verification code is ${otp}. This code expires in 2 minutes.`,
        };

        await transporter.sendMail(mailOptions);

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
