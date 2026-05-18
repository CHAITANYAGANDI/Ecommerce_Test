const Stripe = require('stripe');
const { trustedItemsForReferral, subtotalForItems } = require('../Services/CheckoutIntentService');

// Lazy-init the Stripe client so the service still boots if STRIPE_SECRET_KEY
// is missing in dev — the endpoint will return a clear error instead.
let stripeClient = null;
const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripeClient;
};


// Creates a Stripe PaymentIntent for the cart total. The amount is converted
// to the smallest currency unit (cents for USD) per Stripe's API. The browser
// uses the returned clientSecret to confirm the card payment via Stripe.js,
// then the order endpoint verifies the PaymentIntent succeeded before
// persisting the order.
const createPaymentIntent = async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
        return res.status(503).json({ message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
    }

    try {
        const { currency = 'usd', referralCode } = req.body || {};

        const items = await trustedItemsForReferral(referralCode);
        const amount = subtotalForItems(items);

        const intent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                provider: 'amazon',
                referralCode: referralCode || ''
            }
        });

        return res.status(200).json({
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id
        });
    } catch (err) {
        console.error('[amazon] createPaymentIntent failed:', err.message);
        return res.status(err.status || 500).json({ message: err.message || 'Failed to create payment intent.' });
    }
};


module.exports = { createPaymentIntent };
