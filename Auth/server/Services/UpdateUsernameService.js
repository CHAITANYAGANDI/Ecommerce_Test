const ClientModel = require('../Models/Client');
const { authCookieOptions } = require('../utils/cookieOptions');
const { isValidUsername, USERNAME_MESSAGE } = require('../utils/usernamePolicy');
const {
    signAccessToken,
    signRefreshToken,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS
} = require('../utils/tokens');
const { issueCsrfToken } = require('../Middlewares/csrf');

const updateUsername = async (req, res) => {
    try {
        const { username } = req.body || {};
        if (typeof username !== 'string') {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }
        const trimmed = username.trim();
        if (!isValidUsername(trimmed)) {
            return res.status(400).json({ success: false, message: USERNAME_MESSAGE });
        }

        const existing = await ClientModel.findOne({ username: trimmed });
        if (existing && existing._id.toString() !== String(req.clientId)) {
            return res.status(409).json({ success: false, message: 'That username is already taken' });
        }

        const client = await ClientModel.findByIdAndUpdate(
            req.clientId,
            { username: trimmed },
            { new: true }
        );
        if (!client) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        res.cookie('authToken', signAccessToken(client), authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('authRefreshToken', signRefreshToken(client), authCookieOptions(REFRESH_TOKEN_TTL_MS));
        issueCsrfToken(res);

        return res.status(200).json({
            success: true,
            message: 'Username updated',
            client: { username: client.username, name: client.name }
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('updateUsername error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update username' });
    }
};

module.exports = updateUsername;
