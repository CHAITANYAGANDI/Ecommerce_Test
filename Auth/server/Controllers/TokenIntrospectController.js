const CredentialModel = require('../Models/Credential');
const { timingSafeEqualStr } = require('../utils/timingSafe');

/**
 * Server-to-server introspection endpoint for downstream product services
 * (Amazon, Walmart). Given a client_id, returns the currently-active jti
 * for that credential. Downstream middleware compares this with the jti
 * claim on the incoming JWT — a mismatch means the token has been
 * superseded by a more recent mint (re-auth or refresh) and must be
 * rejected.
 *
 * Trust model: shared-secret via x-internal-auth header. The endpoint
 * never returns the client_secret_hash or any other privileged data —
 * only the active_jti and identifying metadata.
 */
const introspectActiveJti = async (req, res) => {
    const expectedSecret = process.env.INTERNAL_AUTH_SECRET;
    // Fail closed: refuse if the server wasn't configured with a secret.
    // The previous `if (expectedSecret && ...)` form skipped the entire
    // check when the env var was unset, leaving the endpoint world-open.
    if (!expectedSecret) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] ✗ INTERNAL_AUTH_SECRET is not configured — refusing introspection');
        return res.status(503).json({ success: false, message: 'Introspection disabled' });
    }
    const presented = req.headers['x-internal-auth'];
    if (typeof presented !== 'string' || !timingSafeEqualStr(presented, expectedSecret)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { clientId } = req.params;
    if (typeof clientId !== 'string' || clientId.length === 0) {
        return res.status(400).json({ success: false, message: 'clientId is required' });
    }

    try {
        const cred = await CredentialModel.findOne({ client_id: clientId });
        if (!cred) {
            return res.status(404).json({ success: false, message: 'Unknown credential' });
        }

        return res.status(200).json({
            success: true,
            client_id: cred.client_id,
            api_name: cred.api_name,
            active_jti: cred.active_jti || null
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] ✗ introspectActiveJti failed:', err.message);
        return res.status(500).json({ success: false, message: 'Introspection failed' });
    }
};

module.exports = introspectActiveJti;
