const mongoose = require('mongoose');
const { Schema } = mongoose;

// Same shape + collection name as Users/Models/PriceSnapshot.js so both
// services hit the same MongoDB rows. Gateway is the only writer; Users
// is the only reader (for the history endpoint).
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

priceSnapshotSchema.index({ provider: 1, product_id: 1, snapshotted_at: -1 });

module.exports = mongoose.model('price_snapshots', priceSnapshotSchema);
