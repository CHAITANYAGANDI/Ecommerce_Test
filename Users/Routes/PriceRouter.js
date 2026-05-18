const express = require('express');
const router = express.Router();

const ensureAuthorized = require('../Middlewares/Authorization');
const {
    createAlert,
    listAlerts,
    deleteAlert,
    getPriceHistory
} = require('../Controllers/PriceAlertController');
const handleInternalPriceDrop = require('../Controllers/InternalPriceDropController');


// Buyer-facing alert CRUD (mounted under /prices on app.js).
router.post('/alerts', ensureAuthorized, createAlert);
router.get('/alerts', ensureAuthorized, listAlerts);
router.delete('/alerts/:id', ensureAuthorized, deleteAlert);

// Public price history. No auth — chart on product-detail page should
// render for anonymous browsers too.
router.get('/:provider/:productId/history', getPriceHistory);


module.exports = router;
module.exports.internalPriceDrop = handleInternalPriceDrop;
