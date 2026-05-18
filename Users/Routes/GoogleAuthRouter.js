const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getGoogleAuthURL, getGoogleUser } = require('../Middlewares/googleAuth');
const UserModel = require('../Models/User');
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');

const router = express.Router();


const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_COOKIE = 'user_google_oauth_state';
const STATE_TTL_MS = 5 * 60 * 1000;
const isProd = () => process.env.NODE_ENV === 'production';

const stateCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_MS
});

const timingSafeEqualStr = (a, b) => {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};


router.get('/auth/google', (req, res) => {
    const state = crypto.randomBytes(32).toString('base64url');
    res.cookie(STATE_COOKIE, state, stateCookieOptions());
    const url = `${getGoogleAuthURL()}&state=${encodeURIComponent(state)}`;
    res.redirect(url);
});


router.get('/auth/google/callback', async (req, res) => {
    const { code, state } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';

    res.clearCookie(STATE_COOKIE, { ...stateCookieOptions(), maxAge: undefined });

    if (!code) {
        return res.redirect(`${clientUrl}/login?error=google_cancelled`);
    }

    const stateCookie = req.cookies && req.cookies[STATE_COOKIE];
    if (
        typeof state !== 'string' ||
        typeof stateCookie !== 'string' ||
        !timingSafeEqualStr(state, stateCookie)
    ) {
        return res.redirect(`${clientUrl}/login?error=google_state_invalid`);
    }

    try {
        const { user: googleProfile } = await getGoogleUser(code);

        const user = await UserModel.findOne({ email: googleProfile.email });
        if (!user) {
            return res.status(500).send('Authentication failed: user not provisioned');
        }

        const accessToken = jwt.sign(
            { _id: user._id, email: user.email, name: user.name, role: user.role, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = jwt.sign(
            { _id: user._id, email: user.email, type: 'refresh-user' },
            process.env.JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_TTL }
        );

        res.cookie('userToken', accessToken, authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('userRefreshToken', refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_MS));

        const userInfoCookie = JSON.stringify({ name: user.name, email: user.email });
        res.cookie('userInfo', userInfoCookie, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            maxAge: ACCESS_TOKEN_TTL_MS,
            path: '/'
        });

        res.redirect(`${clientUrl}/auth/google/callback`);

    } catch (error) {
        console.error('Error during authentication:', error);
        res.redirect(`${clientUrl}/login?error=google_failed`);
    }
});


router.get('/authenticate', (req, res) => {
    const infoCookie = req.cookies && req.cookies.userInfo;

    if (infoCookie) {
        try {
            const userData = JSON.parse(infoCookie);
            res.clearCookie('userInfo', clearCookieOptions());
            return res.status(200).json({ success: true, user: userData });
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Malformed user info cookie' });
        }
    }
    res.status(404).json({ success: false, message: 'No user data found.' });
});

module.exports = router;
