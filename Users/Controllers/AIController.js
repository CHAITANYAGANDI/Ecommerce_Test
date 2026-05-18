const PriceSnapshot = require('../Models/PriceSnapshot');
const { callOpenAI } = require('../Services/AIService');

const VALID_PROVIDERS = new Set(['amazon', 'walmart']);

// ─── In-memory caches ──────────────────────────────────────────────────
//
// Price advice is deterministic-ish given the same history rows, and the
// history only changes when the gateway writes a new snapshot (every 6h
// per product by default). Caching trims the OpenAI bill by ~50–100x for
// hot products without stale-data risk worth worrying about.
//
// Q&A is not cached — questions vary per buyer, and embedding-style
// similarity caching is more complexity than it's worth at this scale.

const PRICE_ADVICE_TTL_MS = 6 * 60 * 60 * 1000;
const priceAdviceCache = new Map();


// Statistical pre-computation we hand to the model. Doing the math in
// code (instead of in the prompt) makes the model's job easier, the
// answer more accurate, and the prompt shorter (== cheaper).
const summarizeHistory = (snapshots) => {
    if (snapshots.length === 0) return null;
    const prices = snapshots.map((s) => s.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const current = prices[prices.length - 1];
    const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    // Percentile of current price within the observed range. 0 = at the
    // historical low, 100 = at the historical high.
    const range = max - min || 1;
    const percentile = Math.round(((current - min) / range) * 100);
    const trend30dPct = prices.length >= 2
        ? Math.round(((current - prices[0]) / prices[0]) * 100)
        : 0;
    return {
        sampleCount: prices.length,
        current: Number(current.toFixed(2)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        median: Number(median.toFixed(2)),
        mean: Number(mean.toFixed(2)),
        percentile,
        trend30dPct,
        firstSnapshotAt: snapshots[0].snapshotted_at,
        lastSnapshotAt: snapshots[snapshots.length - 1].snapshotted_at
    };
};


// GET /ai/price-advice/:provider/:productId
// Reads the last 30 days of price_snapshots, asks the model for a brief
// buy-now/wait recommendation. Public — no auth needed (chart is public
// too, this is just commentary on the same data).
const priceAdvice = async (req, res) => {
    try {
        const { provider, productId } = req.params;
        if (!VALID_PROVIDERS.has(provider) || !productId) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        const cacheKey = `${provider}:${productId}`;
        const cached = priceAdviceCache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < PRICE_ADVICE_TTL_MS) {
            return res.status(200).json({ success: true, advice: cached.advice, stats: cached.stats, cached: true });
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const snapshots = await PriceSnapshot
            .find({ provider, product_id: productId, snapshotted_at: { $gte: since } })
            .sort({ snapshotted_at: 1 })
            .select('price snapshotted_at -_id');

        if (snapshots.length === 0) {
            return res.status(200).json({
                success: true,
                advice: "Not enough price history yet to make a recommendation. Check back after a few more days of tracking.",
                stats: null,
                cached: false
            });
        }

        const stats = summarizeHistory(snapshots);

        // Fewer than 3 snapshots = no real trend. Skip the model call,
        // return a fixed message — we'd just be paying OpenAI to say
        // "not enough data" in different words.
        if (stats.sampleCount < 3) {
            const advice = `Only ${stats.sampleCount} price snapshot${stats.sampleCount === 1 ? '' : 's'} so far at $${stats.current.toFixed(2)}. We need a few more data points before we can give a buy/wait recommendation.`;
            priceAdviceCache.set(cacheKey, { advice, stats, fetchedAt: Date.now() });
            return res.status(200).json({ success: true, advice, stats, cached: false });
        }

        const system = [
            'You are a concise shopping advisor. Given price history statistics for a single product,',
            'tell the buyer in 1–2 sentences whether NOW is a good time to buy or if they should wait.',
            'Refer to numbers from the stats. Do not use hedging phrases like "based on the data".',
            'Do not use emojis. Do not greet the user. Output is rendered as plain text in a small UI panel.'
        ].join(' ');

        const user = [
            `Stats over the last 30 days (${stats.sampleCount} snapshots):`,
            `- Current price: $${stats.current.toFixed(2)}`,
            `- 30d low: $${stats.min.toFixed(2)}`,
            `- 30d high: $${stats.max.toFixed(2)}`,
            `- Median: $${stats.median.toFixed(2)}`,
            `- Mean: $${stats.mean.toFixed(2)}`,
            `- Current is at the ${stats.percentile}th percentile of the 30d range (0=cheapest, 100=most expensive).`,
            `- 30d trend: ${stats.trend30dPct >= 0 ? '+' : ''}${stats.trend30dPct}%`
        ].join('\n');

        const result = await callOpenAI({ system, user, maxTokens: 80, temperature: 0.2 });
        if (!result.ok) {
            return res.status(503).json({
                success: false,
                message: `AI advice unavailable: ${result.reason}`,
                stats
            });
        }

        priceAdviceCache.set(cacheKey, { advice: result.content, stats, fetchedAt: Date.now() });
        return res.status(200).json({ success: true, advice: result.content, stats, cached: false });
    } catch (error) {
        console.error('priceAdvice error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to generate price advice' });
    }
};


// POST /ai/product-qa
// Grounded Q&A: the client posts product metadata + a question, the model
// answers strictly from that context. Public — buyer doesn't need to be
// logged in to ask. Strict input caps + a system rule against fabricating
// keep this from being weaponized as a free general-purpose chatbot.
const QUESTION_MAX_LEN = 240;
const DESC_MAX_LEN = 2000;

const productQA = async (req, res) => {
    try {
        const {
            product_name,
            product_description,
            product_features,
            product_price,
            question
        } = req.body || {};

        if (typeof product_name !== 'string' || product_name.length === 0 ||
            typeof question !== 'string' || question.length === 0) {
            return res.status(400).json({ success: false, message: 'product_name and question are required' });
        }
        if (question.length > QUESTION_MAX_LEN) {
            return res.status(400).json({ success: false, message: `Question must be ${QUESTION_MAX_LEN} characters or fewer.` });
        }

        const features = Array.isArray(product_features) ? product_features.slice(0, 20) : [];
        const desc = typeof product_description === 'string'
            ? product_description.slice(0, DESC_MAX_LEN)
            : '';

        const system = [
            'You answer shopper questions about ONE specific product, using ONLY the product information provided.',
            'If the answer is not in the provided information, say "I don\'t see that detail in this product\'s listing." and suggest the buyer check the listing or contact the seller.',
            'Be concise: 1–3 sentences. No greetings, no emojis, no bullet points unless the question explicitly asks for a list.',
            'Never invent specifications, dimensions, warranty terms, or compatibility claims that aren\'t stated.',
            'Never answer questions unrelated to this product.'
        ].join(' ');

        const userMsg = [
            `PRODUCT NAME: ${product_name}`,
            typeof product_price === 'number' ? `LISTED PRICE: $${product_price.toFixed(2)}` : null,
            features.length ? `FEATURES:\n${features.map((f) => `- ${f}`).join('\n')}` : null,
            desc ? `DESCRIPTION:\n${desc}` : null,
            '---',
            `QUESTION: ${question}`
        ].filter(Boolean).join('\n\n');

        const result = await callOpenAI({ system, user: userMsg, maxTokens: 220, temperature: 0.2 });
        if (!result.ok) {
            return res.status(503).json({
                success: false,
                message: `AI Q&A unavailable: ${result.reason}`
            });
        }

        return res.status(200).json({ success: true, answer: result.content });
    } catch (error) {
        console.error('productQA error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to answer question' });
    }
};


module.exports = { priceAdvice, productQA };
