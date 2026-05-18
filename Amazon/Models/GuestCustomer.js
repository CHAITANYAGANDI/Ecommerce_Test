const mongoose = require('mongoose');
const { Schema } = mongoose;

// Customer identity collected on Amazon's own checkout page. We dedupe by
// email so a returning guest with the same email reuses their record.
const guestCustomerSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

guestCustomerSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('guestCustomer', guestCustomerSchema);
