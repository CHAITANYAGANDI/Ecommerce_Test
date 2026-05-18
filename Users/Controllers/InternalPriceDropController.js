const mongoose = require('mongoose');
const PriceAlert = require('../Models/PriceAlert');
const UserModel = require('../Models/User');
const sendPriceDropEmail = require('../Services/PriceAlertMailService');

// POST /internal/price-drop
// Called by the gateway after a snapshot crosses an alert's threshold.
// Gated by INTERNAL_AUTH_SECRET (x-internal-auth header).
//
// Body: { alertId, currentPrice, previousPrice, productUrl? }
//
// The gateway has already verified that the alert exists and the
// threshold was crossed, but we re-check here so a forged internal call
// can't spam a buyer with arbitrary "your price dropped" emails using
// only an alert id.
const handleInternalPriceDrop = async (req, res) => {
    const expectedSecret = process.env.INTERNAL_AUTH_SECRET;
    if (!expectedSecret) {
        return res.status(503).json({ success: false, message: 'Internal auth is not configured' });
    }
    if (req.headers['x-internal-auth'] !== expectedSecret) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
        const { alertId, currentPrice, previousPrice, productUrl } = req.body || {};
        if (!mongoose.Types.ObjectId.isValid(alertId) ||
            typeof currentPrice !== 'number' || currentPrice < 0 ||
            typeof previousPrice !== 'number' || previousPrice < 0) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        const alert = await PriceAlert.findById(alertId);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

        // Defense-in-depth: re-verify the threshold here. If a stale gateway
        // process fires after the buyer raised their threshold, we still
        // catch it.
        if (currentPrice > alert.threshold_price) {
            return res.status(200).json({ success: true, skipped: 'price above threshold' });
        }

        // Cooldown — never re-notify within 24h for the same alert. Gateway
        // also enforces this, but a duplicate-suppression layer here makes
        // the system tolerant to retries / parallel snapshot writes.
        const COOLDOWN_MS = 24 * 60 * 60 * 1000;
        if (alert.last_notified_at && (Date.now() - alert.last_notified_at.getTime()) < COOLDOWN_MS) {
            return res.status(200).json({ success: true, skipped: 'cooldown' });
        }

        const buyer = await UserModel.findById(alert.buyer).select('email');
        if (!buyer || !buyer.email) {
            return res.status(404).json({ success: false, message: 'Buyer or email not found' });
        }

        const result = await sendPriceDropEmail({
            toEmail: buyer.email,
            productName: alert.product_name,
            provider: alert.provider,
            previousPrice,
            currentPrice,
            thresholdPrice: alert.threshold_price,
            productUrl
        });

        if (!result.success) {
            console.error('[users] price-drop mail failed:', result.error);
            return res.status(502).json({ success: false, message: 'Mail send failed' });
        }

        alert.last_notified_at = new Date();
        alert.last_known_price = currentPrice;
        await alert.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('handleInternalPriceDrop error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal price-drop handler failed' });
    }
};

module.exports = handleInternalPriceDrop;
