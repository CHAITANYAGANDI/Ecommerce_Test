const express = require("express");
const router = express.Router();
const { forgotPassword, resetPassword, verifyOtp } = require('../Services/ForgotPasswordService');
const otpRateLimit = require('../Middlewares/otpRateLimit');


router.post('/forgotpassword', otpRateLimit, forgotPassword);

router.post('/resetpassword', resetPassword);

router.post('/verifyotp', otpRateLimit, verifyOtp);

module.exports = router;
