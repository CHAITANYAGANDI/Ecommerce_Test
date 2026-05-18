const mongoose = require('mongoose');
const { Schema } = mongoose;

// CheckoutIntent is the "referral" record TrendyTreasures keeps when a user
// hands off to a provider's checkout. We do NOT store the final order or any
// PII (name, address, payment) — those belong to the provider that owns the
// transaction. The intent is purely a record that "user X was redirected to
// provider Y for these items."

const checkoutIntentSchema = new Schema({
    userId: { type: String, default: null },
    provider: { type: String, lowercase: true, enum: ['amazon', 'walmart'], required: true },
    items: [{
        providerProductId: { type: String, default: '' },
        source: { type: String, lowercase: true, enum: ['amazon', 'walmart'] },
        productName: { type: String },
        productPrice: { type: Number },
        productImageUrl: { type: String },
        quantity: { type: Number, required: true, min: 1 }
    }],
    referralCode: { type: String, required: true, unique: true, index: true },
    status: {
        type: String,
        enum: ['created', 'redirected', 'completed', 'abandoned'],
        default: 'created'
    },
    providerOrderId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
});

module.exports = mongoose.model('checkoutIntent', checkoutIntentSchema);
