const CredsModel = require("../Models/Credential");


// POST /admin/auth/callback
// Called by the auth server after a successful client-credentials exchange
// to deliver freshly-minted provider access tokens. Gated by
// INTERNAL_AUTH_SECRET (x-internal-auth header) — anyone who can hit this
// endpoint can overwrite the access tokens used for every upstream
// Amazon/Walmart call, so we fail CLOSED if the secret is unset. Previously
// `if (expectedSecret) { ... }` let the check pass when the env var was
// missing in prod.
const auth = async (req, res) => {

    try {

        const expectedSecret = process.env.INTERNAL_AUTH_SECRET;
        if (!expectedSecret) {
            return res.status(503).json({ success: false, message: 'Internal auth is not configured' });
        }
        if (req.headers['x-internal-auth'] !== expectedSecret) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { creds, accessToken } = req.body;

        if (!Array.isArray(creds) || typeof accessToken !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        await Promise.all(creds.map(async (cred) => {
            await CredsModel.findOneAndUpdate(
                { client_id: cred.client_id, api_name: cred.api_name },
                {
                    client_id: cred.client_id,
                    api_name: cred.api_name,
                    api_url: cred.api_url,
                    access_token: accessToken
                },
                { upsert: true, new: true }
            );
        }));

        return res.status(200).json({
            success: true,
            message: 'Access token received successfully'
        });

    } catch (err) {
        console.error('auth callback error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred while processing the request'
        });
    }
};

module.exports = auth;
