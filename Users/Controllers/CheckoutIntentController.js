const crypto = require('crypto');
const CheckoutIntentModel = require('../Models/CheckoutIntent');
const CartModel = require('../Models/Cart');


const generateReferralCode = () => `TT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

const normalizeProvider = (provider) => {
    const value = String(provider || '').trim().toLowerCase();
    return ['amazon', 'walmart'].includes(value) ? value : null;
};

const providerLabel = (provider) => (provider === 'amazon' ? 'Amazon' : 'Walmart');

const deriveItemSource = (item) => {
    const explicit = normalizeProvider(item && item.source);
    if (explicit) return explicit;

    const soldBy = String((item && item.productSoldBy) || '').toLowerCase();
    if (soldBy.includes('walmart')) return 'walmart';
    if (soldBy.includes('amazon')) return 'amazon';
    return null;
};


const createIntent = async (req, res) => {
    try {
        const { provider, items, userId } = req.body;
        const normalizedProvider = normalizeProvider(provider);

        if (!normalizedProvider) {
            return res.status(400).json({ message: "provider must be 'amazon' or 'walmart'." });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'items must be a non-empty array.' });
        }
        for (const item of items) {
            if (!item || typeof item !== 'object') {
                return res.status(400).json({ message: 'each item must be an object.' });
            }
            const itemSource = deriveItemSource(item);
            if (itemSource && itemSource !== normalizedProvider) {
                const label = providerLabel(normalizedProvider);
                return res.status(400).json({
                    message: `Only ${label} products can be checked out on ${label}.`
                });
            }
            // providerProductId is optional: cart entries created before this
            // field was tracked still need to be able to check out. It's only
            // used as a back-reference for product enrichment on the provider
            // checkout page; the order itself succeeds without it.
            if (!item.quantity || Number(item.quantity) < 1) {
                return res.status(400).json({ message: 'each item needs quantity >= 1.' });
            }
        }

        // Tie the intent to the TT user if one is logged in (the user middleware
        // attaches req.user from the userToken cookie when present); otherwise
        // record an anonymous intent. PII is never stored on the intent itself.
        const tieToUser = userId || (req.user && req.user.email) || null;

        const intent = await CheckoutIntentModel.create({
            userId: tieToUser,
            provider: normalizedProvider,
            items: items.map((i) => ({
                providerProductId: String(i.providerProductId || ''),
                source: deriveItemSource(i) || normalizedProvider,
                productName: i.productName,
                productPrice: i.productPrice,
                productImageUrl: i.productImageUrl,
                quantity: Number(i.quantity)
            })),
            referralCode: generateReferralCode(),
            status: 'redirected'
        });

        return res.status(201).json({
            success: true,
            referralCode: intent.referralCode,
            provider: intent.provider
        });
    } catch (err) {
        console.error('createIntent failed:', err.message);
        return res.status(500).json({ message: 'Failed to create checkout intent.' });
    }
};


// Looked up by the provider's checkout page using only the referralCode in
// the redirect URL. Returns just enough to render the cart summary — no PII.
const getIntent = async (req, res) => {
    try {
        const { referralCode } = req.params;
        const intent = await CheckoutIntentModel.findOne({ referralCode });
        if (!intent) {
            return res.status(404).json({ message: 'Referral not found.' });
        }
        return res.status(200).json({
            referralCode: intent.referralCode,
            provider: intent.provider,
            items: intent.items,
            status: intent.status
        });
    } catch (err) {
        console.error('getIntent failed:', err.message);
        return res.status(500).json({ message: 'Failed to load checkout intent.' });
    }
};


// Marked completed by the provider's order service after it persists the
// real order. Records the providerOrderId for traceability without exposing
// any customer PII back to TrendyTreasures.
const completeIntent = async (req, res) => {
    const expectedSecret = process.env.INTERNAL_AUTH_SECRET;
    if (!expectedSecret) {
        return res.status(503).json({ success: false, message: 'Internal auth is not configured' });
    }
    if (req.headers['x-internal-auth'] !== expectedSecret) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
        const { referralCode } = req.params;
        const { providerOrderId } = req.body || {};
        const updated = await CheckoutIntentModel.findOneAndUpdate(
            { referralCode },
            {
                status: 'completed',
                providerOrderId: providerOrderId || null,
                completedAt: new Date()
            },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Referral not found.' });
        }

        // Clear the ordered items from the user's cart. Only matches by
        // productName within this intent's items so any cart additions made
        // after redirect (other provider, new items) are preserved.
        if (updated.userId && Array.isArray(updated.items) && updated.items.length > 0) {
            const productNames = updated.items
                .map((i) => i.productName)
                .filter((n) => typeof n === 'string' && n.length > 0);
            if (productNames.length > 0) {
                await CartModel.deleteMany({
                    userId: updated.userId,
                    productName: { $in: productNames }
                });
            }
        }

        return res.status(200).json({ success: true, status: updated.status });
    } catch (err) {
        console.error('completeIntent failed:', err.message);
        return res.status(500).json({ message: 'Failed to complete checkout intent.' });
    }
};


module.exports = { createIntent, getIntent, completeIntent };
