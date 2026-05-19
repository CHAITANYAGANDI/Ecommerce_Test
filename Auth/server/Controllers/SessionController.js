const { clearCookieOptions } = require('../utils/cookieOptions');
const { CSRF_COOKIE, csrfCookieOptions, issueCsrfToken } = require('../Middlewares/csrf');


const me = (req, res) => {
    const client = req.client || {};
    // Refresh the CSRF cookie on every authenticated /me response. This
    // covers the page-reload case: the user's auth cookies survive but
    // they may have lost the CSRF cookie (e.g. cleared site data, new
    // browser session). RequireAuth calls /me on mount, so this is the
    // natural re-issue point.
    //
    // We ALSO return the token in the response body so the React client
    // can cache it in memory. On Render (and any deploy where the API and
    // SPA live on different registrable domains — `*.onrender.com` are
    // separate per the Public Suffix List), JS at the SPA origin cannot
    // read a cookie set by the API origin via `document.cookie`. The
    // cookie still ships back automatically thanks to SameSite=None +
    // credentials:'include', so requireCsrf can still validate it — but
    // the client needs the value from the body to put in the header.
    const csrfToken = issueCsrfToken(res);

    res.status(200).json({
        success: true,
        client: {
            username: client.username,
            name: client.name
        },
        csrfToken
    });
};


const logout = (req, res) => {
    res.clearCookie('authToken', clearCookieOptions());
    res.clearCookie('authRefreshToken', clearCookieOptions());
    res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });
    res.status(200).json({ success: true, message: 'Logged out' });
};


module.exports = { me, logout };
