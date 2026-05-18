const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserModel = require("../Models/User");
const {
    getOtpRecord,
    setOtp,
    incrementAttempts,
    deleteOtp,
    MAX_ATTEMPTS
} = require('../Services/OtpService');
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');


const PENDING_RECOVERY_TTL_MS = 10 * 60 * 1000;
const RECOVERY_GRANT_TTL_MS = 10 * 60 * 1000;


const forgotPassword = async (req, res) => {

    try {

        const { email } = req.body;

        if (typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const otp = crypto.randomInt(1000, 10000);
        await setOtp(email, otp, 'recovery');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_ADDRESS,
                pass: process.env.MAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.MAIL_ADDRESS,
            to: email,
            subject: 'Trendy Treasures Password Recovery',
            text: `Your OTP for password reset is ${otp}. This OTP will expire in 2 minutes.`
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error('Failed to send recovery email:', mailErr.message);
            await deleteOtp(email, 'recovery');
            return res.status(500).json({ message: "Failed to send OTP email", success: false });
        }

        const pendingToken = jwt.sign(
            { email, purpose: 'pending-recovery' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.cookie('pendingAuth', pendingToken, authCookieOptions(PENDING_RECOVERY_TTL_MS));

        return res.status(200).json({ message: "OTP sent successfully", success: true });

    } catch (err) {
        console.error('forgotPassword error:', err.message);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (typeof password !== 'string' || password.length < 4) {
            return res.status(400).json({ message: "Password must be at least 4 characters", success: false });
        }

        const grant = req.cookies && req.cookies.recoveryGrant;
        if (!grant) {
            return res.status(401).json({ message: "Recovery session missing or expired", success: false });
        }

        let payload;
        try {
            payload = jwt.verify(grant, process.env.JWT_SECRET);
        } catch (err) {
            res.clearCookie('recoveryGrant', clearCookieOptions());
            return res.status(401).json({ message: "Recovery session expired", success: false });
        }

        if (payload.purpose !== 'recovery-grant') {
            return res.status(400).json({ message: "Invalid recovery session", success: false });
        }

        const user = await UserModel.findOne({ email: payload.email });
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        res.clearCookie('recoveryGrant', clearCookieOptions());

        return res.status(200).json({ message: "Password reset successfully", success: true });
    } catch (error) {
        console.error('resetPassword error:', error.message);
        return res.status(500).json({ message: "Error resetting password", success: false });
    }
};


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (typeof otp !== 'string' && typeof otp !== 'number') {
            return res.status(400).json({ message: "OTP is required", success: false });
        }

        const pending = req.cookies && req.cookies.pendingAuth;
        if (!pending) {
            return res.status(401).json({ message: "No pending recovery session", success: false });
        }

        let payload;
        try {
            payload = jwt.verify(pending, process.env.JWT_SECRET);
        } catch (err) {
            res.clearCookie('pendingAuth', clearCookieOptions());
            return res.status(401).json({ message: "Recovery session expired", success: false });
        }

        if (payload.purpose !== 'pending-recovery') {
            return res.status(400).json({ message: "Invalid recovery session", success: false });
        }

        const record = await getOtpRecord(payload.email, 'recovery');
        if (!record) {
            return res.status(400).json({ message: "OTP expired. Please request a new one.", success: false });
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            await deleteOtp(payload.email, 'recovery');
            res.clearCookie('pendingAuth', clearCookieOptions());
            return res.status(429).json({
                message: "Too many failed attempts. Please request a new OTP.",
                success: false
            });
        }

        if (record.otp !== parseInt(otp, 10)) {
            await incrementAttempts(payload.email, 'recovery');
            return res.status(400).json({ message: "Invalid OTP", success: false });
        }

        await deleteOtp(payload.email, 'recovery');

        const grant = jwt.sign(
            { email: payload.email, purpose: 'recovery-grant' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.cookie('recoveryGrant', grant, authCookieOptions(RECOVERY_GRANT_TTL_MS));
        res.clearCookie('pendingAuth', clearCookieOptions());

        return res.status(200).json({ message: "OTP verified successfully", success: true });
    } catch (err) {
        console.error('verifyOtp (recovery) error:', err.message);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
};

module.exports = {
    forgotPassword,
    resetPassword,
    verifyOtp
};
