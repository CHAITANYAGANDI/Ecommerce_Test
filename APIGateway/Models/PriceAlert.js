const mongoose = require('mongoose');
const { Schema } = mongoose;

// Same shape + collection name as Users/Models/PriceAlert.js so both
// services hit the same MongoDB rows. Gateway reads + updates
// last_notified_at after firing the notification; Users owns the
// buyer-facing CRUD.
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
    product_name: {
        type: String,
        required: true
    },
    threshold_price: {
        type: Number,
        required: true,
        min: 0
    },
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

priceAlertSchema.index({ buyer: 1, provider: 1, product_id: 1 }, { unique: true });
priceAlertSchema.index({ provider: 1, product_id: 1 });

module.exports = mongoose.model('price_alerts', priceAlertSchema);
