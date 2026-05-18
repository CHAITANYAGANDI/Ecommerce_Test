const mongoose = require('mongoose');
const { Schema } = mongoose;

// Shipping address as entered on Amazon's own checkout. Stored separately
// from orders so a customer can have multiple addresses on file. References
// the guestCustomer that owns it.
const addressSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId, ref: 'guestCustomer', required: true, index: true },
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' },
    phone: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('address', addressSchema);
