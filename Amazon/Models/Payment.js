const mongoose = require('mongoose');
const { Schema } = mongoose;

// Payment metadata only — we never store raw card details. The card form on
// the checkout page validates client-side; this record holds just what's
// needed to reason about the transaction (provider, txn id, amount, status).
const paymentSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'order', required: true, index: true },
    paymentProvider: { type: String, required: true, default: 'Stripe' },
    transactionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'paid'
    },
    cardLast4: { type: String },
    cardBrand: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('payment', paymentSchema);
