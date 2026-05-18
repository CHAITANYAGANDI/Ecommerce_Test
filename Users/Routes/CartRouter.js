const ensureAuthorized = require('../Middlewares/Authorization');

const {getCartItems,postCartDetails,updateCartItem,removeCartItem}  = require('../Controllers/CartController');

const express = require("express");
const router = express.Router();


// All routes derive the buyer's identity from req.user (set by ensureAuthorized).
// No userId is accepted from the URL or body — see CartController for the IDOR
// background.
router.get('/get', ensureAuthorized, getCartItems);
router.post('/add', ensureAuthorized, postCartDetails);
router.put('/update', ensureAuthorized, updateCartItem);
router.delete('/remove', ensureAuthorized, removeCartItem);


module.exports = router;
