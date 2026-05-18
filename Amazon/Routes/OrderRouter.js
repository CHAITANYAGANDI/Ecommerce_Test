const express = require('express');
const router = express.Router();

const { placeOrder } = require('../Controllers/OrderController');

// Provider-owned checkout endpoint. Intentionally unauthenticated — Amazon's
// own checkout page is a public guest-checkout flow. Customer identity comes
// from the form on this page, not from any aggregator session.
router.post('/place', placeOrder);

module.exports = router;
