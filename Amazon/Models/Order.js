const mongoose = require('mongoose');
const { Schema } = mongoose;

// Order owned by Amazon (the provider). The referralCode field links back to
// the TrendyTreasures CheckoutIntent that drove the purchase. providerOrderId
// is human-friendly (AMZ-...) and what the customer sees on the confirmation.
const orderSchema = new Schema({
    providerOrderId: { type: String, required: true, unique: true, index: true },
    referralCode: { type: String, index: true, default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'guestCustomer', required: true },
    addressId: { type: Schema.Types.ObjectId, ref: 'address', required: true },
    items: [{
        providerProductId: { type: String, required: true },
        productName: { type: String, required: true },
        productPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'confirmed'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('order', orderSchema);
