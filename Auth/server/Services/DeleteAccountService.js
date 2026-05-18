const ClientModel = require('../Models/Client');
const CredentialModel = require('../Models/Credential');
const { clearCookieOptions } = require('../utils/cookieOptions');
const { csrfCookieOptions, CSRF_COOKIE } = require('../Middlewares/csrf');

const deleteAccount = async (req, res) => {
    try {
        if (!req.clientId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        await CredentialModel.deleteMany({ client: req.clientId });

        const deleted = await ClientModel.findByIdAndDelete(req.clientId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        res.clearCookie('authToken', clearCookieOptions());
        res.clearCookie('authRefreshToken', clearCookieOptions());
        res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: undefined });

        return res.status(200).json({ success: true, message: 'Account deleted' });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('deleteAccount error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete account' });
    }
};

module.exports = deleteAccount;
