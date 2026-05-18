const bcrypt = require('bcryptjs');
const ClientModel = require('../Models/Client');
const {
    getOtpRecord,
    compareOtp,
    incrementAttempts,
    deleteOtp,
    MAX_ATTEMPTS
} = require('../Services/OtpService');
const { isStrongPassword, STRONG_PASSWORD_MESSAGE } = require('../utils/passwordPolicy');

const BCRYPT_COST = 12;

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body || {};

        if (typeof email !== 'string' || typeof otp === 'undefined' || typeof newPassword !== 'string') {
            return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ success: false, message: STRONG_PASSWORD_MESSAGE });
        }

        const normalized = email.toLowerCase().trim();
        const record = await getOtpRecord(normalized, 'recovery');
        if (!record) {
            return res.status(400).json({ success: false, message: 'Code is invalid or has expired' });
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            await deleteOtp(normalized, 'recovery');
            return res.status(429).json({
                success: false,
                message: 'Too many incorrect attempts. Request a new code.'
            });
        }

        const matches = await compareOtp(otp, record);
        if (!matches) {
            const attempts = await incrementAttempts(normalized, 'recovery');
            const remaining = MAX_ATTEMPTS - (attempts ?? MAX_ATTEMPTS);
            return res.status(400).json({
                success: false,
                message: `Incorrect code. ${Math.max(0, remaining)} attempt(s) remaining.`
            });
        }

        const client = await ClientModel.findOne({ email: normalized });
        if (!client) {
            await deleteOtp(normalized, 'recovery');
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        client.password = await bcrypt.hash(newPassword, BCRYPT_COST);
        // Bump tokenVersion — any other live session/refresh token on
        // another device is now dead. Critical for the "I think someone
        // else has access" reset flow.
        client.tokenVersion = (client.tokenVersion || 0) + 1;
        await client.save();
        await deleteOtp(normalized, 'recovery');

        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('resetPassword error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

module.exports = resetPassword;
