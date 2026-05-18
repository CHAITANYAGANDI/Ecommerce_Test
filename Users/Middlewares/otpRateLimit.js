let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    console.warn('[Users] express-rate-limit not installed; OTP rate limiting disabled. Run `npm install express-rate-limit` in Users/.');
    rateLimit = null;
}

const noopMiddleware = (req, res, next) => next();

const otpRateLimit = rateLimit
    ? rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many OTP attempts. Try again later.' }
    })
    : noopMiddleware;

module.exports = otpRateLimit;
