const crypto = require('crypto');
const Stripe = require('stripe');

const GuestCustomer = require('../Models/GuestCustomer');
const Address = require('../Models/Address');
const Order = require('../Models/Order');
const Payment = require('../Models/Payment');
const { trustedItemsForReferral, subtotalForItems } = require('../Services/CheckoutIntentService');

// Server-to-server callback to TrendyTreasures: tells the aggregator that the
// referral converted. Fire-and-forget — provider success doesn't depend on
// the aggregator's bookkeeping. TT_GATEWAY_URL points at the gateway, which
// proxies to the Users service.
const TT_GATEWAY_URL = process.env.TT_GATEWAY_URL || 'http://localhost:7000';

let stripeClient = null;
const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripeClient;
};

const generateProviderOrderId = () => `AMZ-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;


const notifyAggregator = async (referralCode, providerOrderId) => {
    if (!referralCode) return;
    try {
        await fetch(`${TT_GATEWAY_URL}/api/v1/user/checkout/intent/${encodeURIComponent(referralCode)}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.INTERNAL_AUTH_SECRET ? { 'x-internal-auth': process.env.INTERNAL_AUTH_SECRET } : {})
            },
            body: JSON.stringify({ providerOrderId })
        });
    } catch (err) {
        console.warn(`[amazon] Failed to notify aggregator for referral ${referralCode}:`, err.message);
    }
};


const placeOrder = async (req, res) => {
    try {
        const {
            referralCode,
            customer,
            address,
            paymentIntentId
        } = req.body || {};

        const items = await trustedItemsForReferral(referralCode);

        if (!customer || !customer.name || !customer.email) {
            return res.status(400).json({ message: 'customer.name and customer.email are required.' });
        }
        if (!address || !address.line1 || !address.city || !address.state || !address.postalCode) {
            return res.status(400).json({ message: 'shipping address is incomplete.' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'items must be a non-empty array.' });
        }
        if (!paymentIntentId) {
            return res.status(400).json({ message: 'paymentIntentId is required.' });
        }

        // Verify the Stripe charge ourselves — never trust client claims of "paid".
        const stripe = getStripe();
        if (!stripe) {
            return res.status(503).json({ message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
        }

        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
            return res.status(402).json({
                message: `Payment not completed (status: ${intent.status}).`
            });
        }
        if (intent.metadata && intent.metadata.provider !== 'amazon') {
            return res.status(400).json({ message: 'PaymentIntent belongs to another provider.' });
        }
        if (intent.metadata && intent.metadata.referralCode !== referralCode) {
            return res.status(400).json({ message: 'PaymentIntent does not match this checkout referral.' });
        }

        const subtotal = subtotalForItems(items);

        // Defense in depth: server-side total must match the amount Stripe captured,
        // so a tampered client can't pay $1 and ship $1000 worth of goods.
        const expectedAmountInCents = Math.round(subtotal * 100);
        if (intent.amount !== expectedAmountInCents) {
            return res.status(400).json({
                message: `Payment amount mismatch (paid ${intent.amount}, expected ${expectedAmountInCents}).`
            });
        }

        // Idempotency: if this PaymentIntent already produced an order, return it
        // instead of double-shipping.
        const existingPayment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
        if (existingPayment) {
            const order = await Order.findById(existingPayment.orderId);
            if (order) {
                return res.status(200).json({
                    success: true,
                    providerOrderId: order.providerOrderId,
                    orderStatus: order.orderStatus,
                    total: order.total,
                    duplicate: true
                });
            }
        }

        // Upsert the guest customer by email so a returning shopper reuses their record.
        const customerDoc = await GuestCustomer.findOneAndUpdate(
            { email: String(customer.email).toLowerCase() },
            { $setOnInsert: { name: customer.name, email: String(customer.email).toLowerCase() } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const addressDoc = await Address.create({
            customerId: customerDoc._id,
            fullName: address.fullName || customer.name,
            line1: address.line1,
            line2: address.line2 || '',
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country || 'USA',
            phone: address.phone || ''
        });

        const order = await Order.create({
            providerOrderId: generateProviderOrderId(),
            referralCode: referralCode || null,
            customerId: customerDoc._id,
            addressId: addressDoc._id,
            items: items.map((i) => ({
                providerProductId: String(i.providerProductId),
                productName: i.productName,
                productPrice: Number(i.productPrice),
                quantity: Number(i.quantity)
            })),
            subtotal,
            total: intent.amount / 100,
            orderStatus: 'confirmed'
        });

        // Pull payment-method details out of the Stripe intent so the receipt
        // can show "Visa ending in 4242" without us ever touching raw card data.
        const charge = (intent.charges && intent.charges.data && intent.charges.data[0]) || null;
        const card = charge && charge.payment_method_details && charge.payment_method_details.card;

        await Payment.create({
            orderId: order._id,
            paymentProvider: 'Stripe',
            transactionId: paymentIntentId,
            stripePaymentIntentId: paymentIntentId,
            amount: intent.amount / 100,
            currency: intent.currency || 'usd',
            paymentStatus: 'paid',
            cardLast4: card ? card.last4 : '',
            cardBrand: card ? card.brand : ''
        });

        notifyAggregator(order.referralCode, order.providerOrderId);

        return res.status(201).json({
            success: true,
            providerOrderId: order.providerOrderId,
            orderStatus: order.orderStatus,
            total: order.total
        });
    } catch (err) {
        console.error('[amazon] placeOrder failed:', err.message);
        return res.status(err.status || 500).json({ message: err.message || 'Failed to place order.' });
    }
};


module.exports = { placeOrder };
