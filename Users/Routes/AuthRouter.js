const express = require("express");
const router = express.Router();

const { signup, login } = require('../Controllers/AuthController');
const { me, logout } = require('../Controllers/SessionController');
const { refresh } = require('../Controllers/RefreshController');

const verifySignupOtp = require('../Middlewares/verifySignupOtp');
const ensureAuthorized = require('../Middlewares/Authorization');
const otpRateLimit = require('../Middlewares/otpRateLimit');

const { signupValidation, loginvalidation } = require('../Middlewares/userCredsValidation');


// Login is now plain email + password — no OTP. Email verification happens at
// signup time instead, so anyone in the users collection has already proven
// they own their email.
router.post('/login', loginvalidation, login);

// Signup is a two-step flow: /signup queues the user behind a pendingSignup
// cookie + sends an OTP, /signup/verify creates the user and auto-logs them in.
router.post('/signup', signupValidation, signup);
router.post('/signup/verify', otpRateLimit, verifySignupOtp);

router.post('/refresh', refresh);

router.get('/me', ensureAuthorized, me);

router.post('/logout', logout);

module.exports = router;
