const express = require('express');
const router = express.Router();

const { priceAdvice, productQA } = require('../Controllers/AIController');

// Both endpoints are public — the chart on the product detail page is
// public too, and Q&A is meant to help anonymous browsers decide
// whether to sign in / buy. The gateway's global 120/min IP rate limit
// is the abuse backstop; we don't add a stricter per-route limit here.
router.get('/price-advice/:provider/:productId', priceAdvice);
router.post('/product-qa', productQA);

module.exports = router;
