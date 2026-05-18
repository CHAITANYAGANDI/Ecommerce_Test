// Double-submit-cookie CSRF protection. The server issues a non-httpOnly
// `csrfToken` cookie on every authenticated response (login, refresh,
// /me). The browser's JS reads the cookie value and echoes it back in an
// `x-csrf-token` header on every state-changing call. A cross-site
// attacker can't read the cookie (because of same-origin restrictions on
// document.cookie), so they can't forge the header — even though the
// browser will still send the cookie automatically.

const crypto = require('crypto');
const { timingSafeEqualStr } = require('../utils/timingSafe');

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === 'production';

const csrfCookieOptions = () => ({
    httpOnly: false,       // intentional: client JS must read this
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    path: '/',
    maxAge: CSRF_TTL_MS
});

const issueCsrfToken = (res) => {
    const token = crypto.randomBytes(32).toString('base64url');
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
    return token;
};

// Safe methods don't need protection — they shouldn't mutate state.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const requireCsrf = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken || !timingSafeEqualStr(cookieToken, String(headerToken))) {
        return res.status(403).json({ success: false, message: 'CSRF token missing or invalid' });
    }
    next();
};

module.exports = {
    CSRF_COOKIE,
    CSRF_HEADER,
    issueCsrfToken,
    requireCsrf,
    csrfCookieOptions
};
