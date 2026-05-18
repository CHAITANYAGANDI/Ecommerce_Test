const { clearCookieOptions } = require('../utils/cookieOptions');
const { CSRF_COOKIE, csrfCookieOptions, issueCsrfToken } = require('../Middlewares/csrf');


const me = (req, res) => {
    const client = req.client || {};
    // Refresh the CSRF cookie on every authenticated /me response. This
    // covers the page-reload case: the user's auth cookies survive but
    // they may have lost the CSRF cookie (e.g. cleared site data, new
    // browser session). RequireAuth calls /me on mount, so this is the
    // natural re-issue point.
    issueCsrfToken(res);

    res.status(200).json({
        success: true,
        client: {
            username: client.username,
            name: client.name
        }
    });
};


const logout = (req, res) => {
    res.clearCookie('authToken', clearCookieOptions());
    res.clearCookie('authRefreshToken', clearCookieOptions());
    res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });
    res.status(200).json({ success: true, message: 'Logged out' });
};


module.exports = { me, logout };
