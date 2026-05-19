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
    let token = req.cookies && req.cookies[CSRF_COOKIE];
    if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
    }
    // Stash on res.locals so the `/csrf-token` endpoint (and any handler
    // that wants to surface the token in its response body) can read it.
    // Reading req.cookies in the handler isn't enough: when this
    // middleware just MINTED a new token, the value is only in the
    // outgoing Set-Cookie header, not in the incoming Cookie jar.
    res.locals.csrfToken = token;
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
