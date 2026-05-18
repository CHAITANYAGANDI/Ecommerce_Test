const mongoose = require('mongoose');
const { Schema } = mongoose;

// One row per buyer per tracked product. Buyer sets a threshold price;
// the gateway evaluates matching alerts after every snapshot write and
// posts to /internal/price-drop when the threshold is crossed. The
// last_notified_at field is the cooldown gate — we never notify twice
// within 24h, even if the price stays at/below the threshold across
// multiple snapshots.
const priceAlertSchema = new Schema({
    buyer: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['amazon', 'walmart']
    },
    product_id: {
        type: String,
        required: true
    },
    // Denormalized so the notification email doesn't have to re-fetch
    // upstream just to render the product name in the subject line.
    product_name: {
        type: String,
        required: true
    },
    threshold_price: {
        type: Number,
        required: true,
        min: 0
    },
    // The price observed when the alert was created (or last evaluated).
    // Surfaced in the email body so the buyer sees "was $X, now $Y".
    last_known_price: {
        type: Number,
        required: true,
        min: 0
    },
    last_notified_at: {
        type: Date,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// One alert per buyer per product. Buyers can edit threshold by deleting
// + recreating; keeps the CRUD surface small.
priceAlertSchema.index({ buyer: 1, provider: 1, product_id: 1 }, { unique: true });

// Drives the gateway's "find alerts to evaluate" query after each snapshot.
priceAlertSchema.index({ provider: 1, product_id: 1 });

module.exports = mongoose.model('price_alerts', priceAlertSchema);
