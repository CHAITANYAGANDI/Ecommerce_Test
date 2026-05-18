const bcrypt = require('bcryptjs');
const OTPModel = require('../Models/Otp');

const MAX_ATTEMPTS = 5;
// Minimum gap between resends to the same address — anti-mailbomb.
const RESEND_COOLDOWN_MS = 60 * 1000;
// OTPs are 6 digits + 10-minute TTL; cost 8 is more than enough to make
// brute-force expensive without slowing the verify-path noticeably.
const OTP_BCRYPT_COST = 8;

async function getOtpRecord(email, purpose = 'recovery') {
    try {
        return await OTPModel.findOne({ email, purpose });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching OTP:', err.message);
        return null;
    }
}

async function setOtp(email, otp, purpose = 'recovery') {
    const otpHash = await bcrypt.hash(String(otp), OTP_BCRYPT_COST);
    await OTPModel.findOneAndUpdate(
        { email, purpose },
        {
            email,
            purpose,
            otpHash,
            attempts: 0,
            createdAt: new Date(),
            lastSentAt: new Date()
        },
        { upsert: true, new: true }
    );
}

async function compareOtp(submitted, record) {
    if (!record || !record.otpHash) return false;
    try {
        return await bcrypt.compare(String(submitted), record.otpHash);
    } catch {
        return false;
    }
}

async function incrementAttempts(email, purpose = 'recovery') {
    try {
        const record = await OTPModel.findOneAndUpdate(
            { email, purpose },
            { $inc: { attempts: 1 } },
            { new: true }
        );
        return record ? record.attempts : null;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error incrementing OTP attempts:', error.message);
        return null;
    }
}

async function deleteOtp(email, purpose = 'recovery') {
    try {
        await OTPModel.deleteOne({ email, purpose });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error deleting OTP:', error.message);
    }
}

// Returns true if the previous OTP for this address was issued inside the
// cooldown window — caller should refuse to send another mail.
async function isInResendCooldown(email, purpose = 'recovery') {
    const record = await getOtpRecord(email, purpose);
    if (!record || !record.lastSentAt) return false;
    return Date.now() - new Date(record.lastSentAt).getTime() < RESEND_COOLDOWN_MS;
}

module.exports = {
    getOtpRecord,
    setOtp,
    compareOtp,
    incrementAttempts,
    deleteOtp,
    isInResendCooldown,
    MAX_ATTEMPTS,
    RESEND_COOLDOWN_MS
};
