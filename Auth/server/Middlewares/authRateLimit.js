// Per-endpoint rate limits for auth-critical routes. These layer on top
// of the global limiter in app.js — the global one stops volumetric
// abuse; these stop targeted brute-force against a single account or
// the OTP/reset mailbox.
//
// Keys default to req.ip (the real client IP once `app.set('trust proxy')`
// is in place). For account-bound endpoints we also key on the
// submitted username/email so an attacker can't dodge by rotating IPs.
//
// We route the IP portion of every key through `ipKeyGenerator` so IPv6
// /64-prefix normalization is applied (otherwise an attacker on IPv6
// could just walk the lower 64 bits to dodge per-IP limits).

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const ipKey = (req, res) => ipKeyGenerator(req, res);

const ipAndBodyKey = (field) => (req, res) => {
    const ip = ipKeyGenerator(req, res);
    const v = String((req.body && req.body[field]) || '').toLowerCase().trim();
    return `${ip}|${v}`;
};

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipAndBodyKey('username'),
    message: { success: false, message: 'Too many login attempts. Try again later.' }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipAndBodyKey('email'),
    message: { success: false, message: 'Too many reset requests. Try again later.' }
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipAndBodyKey('email'),
    message: { success: false, message: 'Too many reset attempts. Try again later.' }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
    message: { success: false, message: 'Too many signups from this IP. Try again later.' }
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKey,
    message: { success: false, message: 'Too many refresh requests. Try again later.' }
});

module.exports = {
    loginLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter,
    registerLimiter,
    refreshLimiter
};
