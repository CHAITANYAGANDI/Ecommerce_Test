const mongoose = require('mongoose');
const { Schema } = mongoose;

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    purpose: {
        type: String,
        enum: ['signup', 'recovery'],
        required: true,
        default: 'signup'
    },
    otp: {
        type: Number,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 120
    }
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const OTPModel = mongoose.model('otp', otpSchema);

module.exports = OTPModel;
