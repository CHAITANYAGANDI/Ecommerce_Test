const mongoose = require('mongoose');
const { Schema } = mongoose;

// One row per (provider, product) per snapshot moment. Written by the
// gateway whenever a product-detail request flows through it and the last
// snapshot for that product is older than the stale threshold. Read by
// the buyer-facing price-history endpoint to render charts.
const priceSnapshotSchema = new Schema({
    provider: {
        type: String,
        required: true,
        enum: ['amazon', 'walmart'],
        index: true
    },
    product_id: {
        type: String,
        required: true,
        index: true
    },
    product_name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    snapshotted_at: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index drives both lookups: "last snapshot for this product" and
// "ordered history for this product". Descending on snapshotted_at lets
// the .findOne() for staleness return the most recent row directly.
priceSnapshotSchema.index({ provider: 1, product_id: 1, snapshotted_at: -1 });

module.exports = mongoose.model('price_snapshots', priceSnapshotSchema);
