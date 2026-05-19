const bcrypt = require('bcryptjs');
const ClientModel = require('../Models/Client');
const { isStrongPassword, STRONG_PASSWORD_MESSAGE } = require('../utils/passwordPolicy');
const {
    signAccessToken,
    signRefreshToken,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS
} = require('../utils/tokens');
const { authCookieOptions } = require('../utils/cookieOptions');
const { issueCsrfToken } = require('../Middlewares/csrf');

const BCRYPT_COST = 12;

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body || {};

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ success: false, message: 'Passwords are required' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ success: false, message: STRONG_PASSWORD_MESSAGE });
        }
        if (typeof confirmNewPassword === 'string' && confirmNewPassword !== newPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different' });
        }

        const client = await ClientModel.findById(req.clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        if (!client.password) {
            // Google-only accounts have no local password to compare against.
            return res.status(400).json({
                success: false,
                message: 'This account uses Google sign-in. Manage your password through Google.'
            });
        }

        const ok = await bcrypt.compare(currentPassword, client.password);
        if (!ok) {
            return res.status(403).json({ success: false, message: 'Current password is incorrect' });
        }

        client.password = await bcrypt.hash(newPassword, BCRYPT_COST);
        // Bump tokenVersion so every previously-issued refresh token on
        // every other device dies on its next /refresh call.
        client.tokenVersion = (client.tokenVersion || 0) + 1;
        await client.save();

        // Re-issue THIS session's cookies with the new tokenVersion, so the
        // caller doesn't get logged out by their own action.
        res.cookie('authToken', signAccessToken(client), authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('authRefreshToken', signRefreshToken(client), authCookieOptions(REFRESH_TOKEN_TTL_MS));
        // Return the rotated CSRF token in the body so the SPA can refresh
        // its cached copy — see SessionController.me for the rationale.
        const csrfToken = issueCsrfToken(res);

        return res.status(200).json({ success: true, message: 'Password updated', csrfToken });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('updatePassword error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update password' });
    }
};

module.exports = updatePassword;
