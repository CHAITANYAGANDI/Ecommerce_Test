const mongoose = require('mongoose');
const { Schema } = mongoose;

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        index: true,
        lowercase: true,
        trim: true
    },
    purpose: {
        type: String,
        enum: ['recovery'],
        required: true,
        default: 'recovery'
    },
    // bcrypt hash of the 6-digit code. The plaintext is only ever known to
    // the mail recipient; if the DB is read, leaked records reveal nothing
    // usable (an attacker would have to brute-force a 6-digit space against
    // bcrypt for every record, per the schema's 10-minute TTL).
    otpHash: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    // Throttles resend abuse. The mail service refuses to send a new code
    // if the last one was issued within the cooldown window.
    lastSentAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600
    }
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const OTPModel = mongoose.model('authOtp', otpSchema);

// Older deployments stored `otp` as a plaintext number — drop the index/field
// at startup so the new hashed schema doesn't conflict.
OTPModel.syncIndexes().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[auth-server] Otp.syncIndexes failed:', err.message);
});

module.exports = OTPModel;
