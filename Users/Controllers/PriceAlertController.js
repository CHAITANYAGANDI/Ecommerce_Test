const mongoose = require('mongoose');
const PriceAlert = require('../Models/PriceAlert');
const PriceSnapshot = require('../Models/PriceSnapshot');

const VALID_PROVIDERS = new Set(['amazon', 'walmart']);

const userIdFromReq = (req) => req.user && (req.user._id || req.user.id || req.user.userId);

// POST /prices/alerts — buyer creates a price alert.
// Body: { provider, product_id, product_name, threshold_price, last_known_price }
// Returns the created alert. Uniqueness is per (buyer, provider, product_id);
// re-creating with a new threshold deletes the previous row first.
const createAlert = async (req, res) => {
    try {
        const buyerId = userIdFromReq(req);
        if (!buyerId) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const { provider, product_id, product_name, threshold_price, last_known_price } = req.body || {};

        if (!VALID_PROVIDERS.has(provider) ||
            typeof product_id !== 'string' || product_id.length === 0 ||
            typeof product_name !== 'string' || product_name.length === 0 ||
            typeof threshold_price !== 'number' || threshold_price < 0 ||
            typeof last_known_price !== 'number' || last_known_price < 0) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        // Upsert: same (buyer, provider, product_id) just updates the threshold.
        // Simpler than asking the buyer to delete-then-create when changing it.
        const alert = await PriceAlert.findOneAndUpdate(
            { buyer: buyerId, provider, product_id },
            {
                buyer: buyerId,
                provider,
                product_id,
                product_name,
                threshold_price,
                last_known_price,
                last_notified_at: null,
                created_at: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json({ success: true, alert });
    } catch (error) {
        console.error('createAlert error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create alert' });
    }
};

// GET /prices/alerts — list this buyer's alerts.
const listAlerts = async (req, res) => {
    try {
        const buyerId = userIdFromReq(req);
        if (!buyerId) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const alerts = await PriceAlert
            .find({ buyer: buyerId })
            .sort({ created_at: -1 });
        return res.status(200).json({ success: true, alerts });
    } catch (error) {
        console.error('listAlerts error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to list alerts' });
    }
};

// DELETE /prices/alerts/:id — buyer untracks a product.
const deleteAlert = async (req, res) => {
    try {
        const buyerId = userIdFromReq(req);
        if (!buyerId) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid alert id' });
        }

        // Scoped by buyer so one user can't delete another user's alert by id.
        const deleted = await PriceAlert.findOneAndDelete({ _id: id, buyer: buyerId });
        if (!deleted) return res.status(404).json({ success: false, message: 'Alert not found' });
        return res.status(200).json({ success: true, message: 'Alert deleted' });
    } catch (error) {
        console.error('deleteAlert error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete alert' });
    }
};

// GET /prices/:provider/:productId/history?days=30
// Public — anyone can read price history for any product. Used by the
// chart on the product-detail page. Caps the range to 365 days so a
// pathological request can't pull years of snapshots in one call.
const getPriceHistory = async (req, res) => {
    try {
        const { provider, productId } = req.params;
        if (!VALID_PROVIDERS.has(provider)) {
            return res.status(400).json({ success: false, message: 'Invalid provider' });
        }

        const daysRaw = parseInt(req.query.days, 10);
        const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, daysRaw)) : 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const snapshots = await PriceSnapshot
            .find({ provider, product_id: productId, snapshotted_at: { $gte: since } })
            .sort({ snapshotted_at: 1 })
            .select('price snapshotted_at -_id');

        return res.status(200).json({
            success: true,
            provider,
            product_id: productId,
            days,
            snapshots
        });
    } catch (error) {
        console.error('getPriceHistory error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch price history' });
    }
};

module.exports = {
    createAlert,
    listAlerts,
    deleteAlert,
    getPriceHistory
};
