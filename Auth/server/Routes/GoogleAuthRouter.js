const express = require('express');
const crypto = require('crypto');
const { getGoogleAuthURL, getGoogleUser } = require('../Middlewares/googleAuth');
const ClientModel = require('../Models/Client');
const { authCookieOptions } = require('../utils/cookieOptions');
const {
    signAccessToken,
    signRefreshToken,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS
} = require('../utils/tokens');
const { issueCsrfToken } = require('../Middlewares/csrf');
const { timingSafeEqualStr } = require('../utils/timingSafe');

const router = express.Router();

const AUTH_CLIENT_URL = () => process.env.AUTH_CLIENT_URL || 'http://localhost:3002';

const isProd = () => process.env.NODE_ENV === 'production';

const STATE_COOKIE = 'google_oauth_state';
const STATE_TTL_MS = 5 * 60 * 1000;

const stateCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    // Lax so the cookie survives the cross-site GET that Google sends
    // back to us. None+secure also works but Lax is the standard for
    // top-level navigation cookies.
    sameSite: 'lax',
    path: '/auth',
    maxAge: STATE_TTL_MS
});

const slugifyUsername = (email) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || 'user';
    return base;
};

router.get('/google', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.redirect(
            `${AUTH_CLIENT_URL()}/auth/login?error=google_unconfigured`
        );
    }
    // CSRF on the OAuth flow: random state goes in both a short-lived
    // httpOnly cookie and the redirect URL. The callback compares them
    // with constant-time eq before doing any work, so an attacker can't
    // smuggle their own `code` into a victim's session.
    const state = crypto.randomBytes(32).toString('base64url');
    res.cookie(STATE_COOKIE, state, stateCookieOptions());
    res.redirect(getGoogleAuthURL(state));
});

router.get('/google/callback', async (req, res) => {
    const { code, error: googleError, state: stateParam } = req.query;

    // Always clear the state cookie regardless of outcome.
    res.clearCookie(STATE_COOKIE, { ...stateCookieOptions(), maxAge: undefined });

    if (googleError || !code) {
        return res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=google_cancelled`);
    }

    const stateCookie = req.cookies && req.cookies[STATE_COOKIE];
    if (
        typeof stateParam !== 'string' ||
        typeof stateCookie !== 'string' ||
        !timingSafeEqualStr(stateParam, stateCookie)
    ) {
        return res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=google_state_invalid`);
    }

    try {
        const { user: profile } = await getGoogleUser(code);
        const email = String(profile.email || '').toLowerCase().trim();
        if (!email) {
            return res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=google_no_email`);
        }
        // Refuse unverified Google emails — otherwise anyone who controls
        // an unverified address on an IdP could log in as the matching
        // local account.
        if (profile.email_verified !== true) {
            return res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=google_email_unverified`);
        }

        let client = await ClientModel.findOne({ email });
        if (client && !client.isGoogleUser) {
            // Account-takeover guard: an account already exists for this
            // email and was registered with a password (not Google). We
            // refuse to silently log the user in; the rightful owner can
            // link Google from an authenticated settings page later.
            return res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=email_already_registered`);
        }
        if (!client) {
            const base = slugifyUsername(email);
            let username = base;
            let suffix = 0;
            while (await ClientModel.findOne({ username })) {
                suffix += 1;
                username = `${base}${suffix}`;
            }
            client = await ClientModel.create({
                name: profile.name || profile.given_name || email,
                username,
                email,
                isGoogleUser: true
            });
        }

        res.cookie('authToken', signAccessToken(client), authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('authRefreshToken', signRefreshToken(client), authCookieOptions(REFRESH_TOKEN_TTL_MS));
        issueCsrfToken(res);

        res.redirect(`${AUTH_CLIENT_URL()}/auth/google/callback`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] Google auth error:', err.message);
        res.redirect(`${AUTH_CLIENT_URL()}/auth/login?error=google_failed`);
    }
});

module.exports = router;
