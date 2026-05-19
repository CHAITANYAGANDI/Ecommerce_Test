const jwt = require('jsonwebtoken');
const ClientModel = require('../Models/Client');
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');
const {
    signAccessToken,
    signRefreshToken,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
    USER_ALG
} = require('../utils/tokens');
const { issueCsrfToken, CSRF_COOKIE, csrfCookieOptions } = require('../Middlewares/csrf');


const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies && req.cookies.authRefreshToken;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'No refresh token' });
        }

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_SECRET, {
                algorithms: [USER_ALG]
            });
        } catch (err) {
            res.clearCookie('authToken', clearCookieOptions());
            res.clearCookie('authRefreshToken', clearCookieOptions());
            res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });
            return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
        }

        if (payload.type !== 'refresh-client') {
            return res.status(401).json({ success: false, message: 'Invalid refresh token type' });
        }

        const client = await ClientModel.findById(payload._id);
        if (!client) {
            res.clearCookie('authToken', clearCookieOptions());
            res.clearCookie('authRefreshToken', clearCookieOptions());
            res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });
            return res.status(401).json({ success: false, message: 'Client no longer exists' });
        }

        // Token-version check — every refresh JWT carries the `tv` claim
        // taken from the client doc at issue time. Password change,
        // password reset, and admin "log out everywhere" all bump the
        // counter, which immediately invalidates every refresh token
        // issued before the bump.
        if ((payload.tv ?? null) !== (client.tokenVersion || 0)) {
            res.clearCookie('authToken', clearCookieOptions());
            res.clearCookie('authRefreshToken', clearCookieOptions());
            res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });
            return res.status(401).json({ success: false, message: 'Session revoked' });
        }

        res.cookie('authToken', signAccessToken(client), authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('authRefreshToken', signRefreshToken(client), authCookieOptions(REFRESH_TOKEN_TTL_MS));
        // Return the new CSRF token in the body — see SessionController.me
        // for the cross-registrable-domain rationale.
        const csrfToken = issueCsrfToken(res);

        return res.status(200).json({
            success: true,
            client: { username: client.username, name: client.name },
            csrfToken
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Refresh error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to refresh session' });
    }
};


module.exports = { refresh };
