// Same-origin enforcement for cookie-authed form POSTs that can't carry
// a CSRF header (the EJS-rendered /auth/client/login page). We trust
// `Origin` first, then fall back to `Referer`. Either must match an
// entry in CORS_ORIGINS, or — in dev — a localhost origin.

const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const allowedOrigins = () =>
    (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const isProd = () => process.env.NODE_ENV === 'production';

const originOf = (urlStr) => {
    try {
        const u = new URL(urlStr);
        return `${u.protocol}//${u.host}`;
    } catch {
        return null;
    }
};

const requireSameOrigin = (req, res, next) => {
    const origin = req.headers.origin || originOf(req.headers.referer || '');
    if (!origin) {
        return res.status(403).send('Forbidden: missing Origin/Referer');
    }
    const allow = allowedOrigins();
    if (allow.includes(origin)) return next();
    if (!isProd() && localhostRegex.test(origin)) return next();
    return res.status(403).send('Forbidden: untrusted origin');
};

module.exports = requireSameOrigin;
