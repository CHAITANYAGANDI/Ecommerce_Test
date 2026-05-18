const crypto = require('crypto');

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';

const csrfCookieOptions = () => ({
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
    maxAge: CSRF_TTL_MS
});

const issueCsrfToken = (req, res, next) => {
    if (!req.cookies || !req.cookies[CSRF_COOKIE]) {
        res.cookie(CSRF_COOKIE, crypto.randomBytes(32).toString('hex'), csrfCookieOptions());
    }
    next();
};

const hasSessionCookie = (req) => {
    const cookies = req.cookies || {};
    return Boolean(
        cookies.userToken ||
        cookies.userRefreshToken ||
        cookies.adminToken ||
        cookies.adminRefreshToken ||
        cookies.pendingSignup ||
        cookies.pendingAuth ||
        cookies.recoveryGrant
    );
};

const requireCsrf = (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    if (!hasSessionCookie(req)) return next();

    const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ success: false, message: 'CSRF token missing or invalid' });
    }
    return next();
};

module.exports = {
    issueCsrfToken,
    requireCsrf
};
