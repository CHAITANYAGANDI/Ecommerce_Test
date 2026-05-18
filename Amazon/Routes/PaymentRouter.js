const express = require('express');
const router = express.Router();

const { createPaymentIntent } = require('../Controllers/PaymentController');

// Public endpoint by design — the buyer hits this from the source-branded
// checkout page after entering the cart referral. The intent only locks an
// amount with Stripe; the order isn't saved until the order endpoint verifies
// the PaymentIntent succeeded server-side.
router.post('/create-intent', createPaymentIntent);

module.exports = router;
