const express = require('express');
const router = express.Router();

const { createIntent, getIntent, completeIntent } = require('../Controllers/CheckoutIntentController');

// All endpoints are intentionally unauthenticated. The referralCode itself is
// the capability — anyone holding a valid code can read the intent. Since the
// intent contains no PII (just provider product ids and quantities), this is
// safe and matches the Google-Flights-style hand-off model where neither side
// needs to share user identity through the redirect.

router.post('/intent', createIntent);

router.get('/intent/:referralCode', getIntent);

router.post('/intent/:referralCode/complete', completeIntent);

module.exports = router;
