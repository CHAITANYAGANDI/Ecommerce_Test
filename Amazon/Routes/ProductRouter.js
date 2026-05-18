const express = require("express");
const router = express.Router();

const ensureAuthenticated = require('../Middlewares/Authorization');

const {
    getAllProductDetails,
    getProductDetails
} = require('../Controllers/ProductController');


router.get('/get', ensureAuthenticated, getAllProductDetails);

router.get('/:productId', ensureAuthenticated, getProductDetails);


module.exports = router;
