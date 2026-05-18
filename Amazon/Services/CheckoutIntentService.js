const mongoose = require('mongoose');
const ProductsModel = require('../Models/Product');

const TT_GATEWAY_URL = process.env.TT_GATEWAY_URL || 'http://localhost:7000';
const PROVIDER = 'amazon';

const fetchCheckoutIntent = async (referralCode) => {
    if (!referralCode || typeof referralCode !== 'string') {
        const err = new Error('referralCode is required.');
        err.status = 400;
        throw err;
    }

    const res = await fetch(`${TT_GATEWAY_URL}/api/v1/user/checkout/intent/${encodeURIComponent(referralCode)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.message || 'Checkout referral not found.');
        err.status = res.status;
        throw err;
    }
    if (data.provider !== PROVIDER) {
        const err = new Error('Checkout referral belongs to another provider.');
        err.status = 400;
        throw err;
    }
    if (data.status === 'completed') {
        const err = new Error('This checkout has already been completed.');
        err.status = 409;
        throw err;
    }
    return data;
};

const trustedItemsForReferral = async (referralCode) => {
    const intent = await fetchCheckoutIntent(referralCode);
    const items = [];

    for (const item of intent.items || []) {
        const productId = String(item.providerProductId || '');
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const err = new Error('Checkout referral contains an invalid product.');
            err.status = 400;
            throw err;
        }

        const product = await ProductsModel.findOne({ _id: productId, isActive: true });
        if (!product) {
            const err = new Error('Checkout referral contains an unavailable product.');
            err.status = 409;
            throw err;
        }

        const quantity = Math.max(1, Number(item.quantity || 1));
        items.push({
            providerProductId: String(product._id),
            productName: product.name,
            productPrice: Number(product.price),
            quantity
        });
    }

    if (items.length === 0) {
        const err = new Error('Checkout referral has no items.');
        err.status = 400;
        throw err;
    }

    return items;
};

const subtotalForItems = (items) =>
    items.reduce((sum, item) => sum + Number(item.productPrice) * Number(item.quantity), 0);

module.exports = {
    trustedItemsForReferral,
    subtotalForItems
};
