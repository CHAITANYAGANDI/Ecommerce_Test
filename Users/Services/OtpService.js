const OTPModel = require("../Models/Otp");


const MAX_ATTEMPTS = 5;


async function getOtpRecord(email, purpose = 'signup') {
    try {
        return await OTPModel.findOne({ email, purpose });
    } catch (err) {
        console.error('Error fetching OTP:', err.message);
        return null;
    }
}


async function getOtp(email, purpose = 'signup') {
    const record = await getOtpRecord(email, purpose);
    return record ? record.otp : null;
}


async function setOtp(email, otp, purpose = 'signup') {
    try {
        await OTPModel.findOneAndUpdate(
            { email, purpose },
            { email, purpose, otp, attempts: 0, createdAt: new Date() },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error saving OTP:', error.message);
    }
}


async function incrementAttempts(email, purpose = 'signup') {
    try {
        const record = await OTPModel.findOneAndUpdate(
            { email, purpose },
            { $inc: { attempts: 1 } },
            { new: true }
        );
        return record ? record.attempts : null;
    } catch (error) {
        console.error('Error incrementing OTP attempts:', error.message);
        return null;
    }
}


async function deleteOtp(email, purpose = 'signup') {
    try {
        await OTPModel.deleteOne({ email, purpose });
    } catch (error) {
        console.error('Error deleting OTP:', error.message);
    }
}


module.exports = {
    getOtp,
    getOtpRecord,
    setOtp,
    incrementAttempts,
    deleteOtp,
    MAX_ATTEMPTS
};
