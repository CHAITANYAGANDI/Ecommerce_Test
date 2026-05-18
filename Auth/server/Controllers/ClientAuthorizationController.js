const bcrypt = require('bcryptjs');
const axios = require('axios');
const { randomUUID } = require('crypto');
const CredentialModel = require('../Models/Credential');
const ClientModel = require('../Models/Client');
const { signProviderToken } = require('../utils/tokens');
const { assertSafeOutbound, isStaticallySafeUrl } = require('../utils/safeRedirect');

const clientAuthorization = async (req, res) => {
    const { clientId, clientSecret, redirectUri, username } = req.body;

    if (typeof clientId !== 'string' ||
        typeof clientSecret !== 'string' ||
        typeof redirectUri !== 'string' ||
        typeof username !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // SSRF: refuse obviously-bad redirect URIs before doing any DB work.
    if (!isStaticallySafeUrl(redirectUri)) {
        return res.status(400).json({
            success: false,
            message: 'redirectUri must be a public https URL (http allowed in dev only)'
        });
    }

    try {
        const client = await ClientModel.findOne({ username });
        if (!client) {
            return res.status(401).json({ success: false, message: 'Invalid client credentials' });
        }

        // Fetch by client (owner) + client_id + redirect_uri. The hash is
        // selected explicitly because the schema marks it `select: false`.
        const cred = await CredentialModel
            .findOne({
                client: client._id,
                client_id: clientId,
                redirect_uri: redirectUri
            })
            .select('+client_secret_hash');

        if (!cred) {
            return res.status(401).json({ success: false, message: 'Invalid client credentials' });
        }

        const secretMatches = await bcrypt.compare(clientSecret, cred.client_secret_hash || '');
        if (!secretMatches) {
            return res.status(401).json({ success: false, message: 'Invalid client credentials' });
        }

        // Provider tokens are signed with JWT_PROVIDER_SECRET (separate trust
        // domain from user session tokens). TTL comes from env so we can keep
        // refresh + initial token in sync.
        //
        // jti is stamped on both the JWT and the credential row. Downstream
        // services compare the two via the introspection endpoint and reject
        // any token whose jti != cred.active_jti — so re-authorizing here
        // immediately revokes every prior token for this credential.
        const CLIENT_TOKEN_TTL = process.env.CLIENT_TOKEN_TTL || '30d';
        const jti = randomUUID();
        const token = signProviderToken(
            {
                client_name: client.name,
                client_id: cred.client_id,
                api_url: cred.api_url,
                api_name: cred.api_name,
                type: 'client-access',
                jti
            },
            CLIENT_TOKEN_TTL
        );

        cred.active_jti = jti;
        await cred.save();

        // Runtime SSRF check: resolve the redirect URI and refuse private
        // ranges. DNS may have changed since credential creation.
        try {
            await assertSafeOutbound(redirectUri);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('ClientAuthorization refused unsafe redirectUri:', err.message);
            return res.status(400).json({
                success: false,
                message: 'redirectUri resolves to a non-public address'
            });
        }

        const internalSecret = process.env.INTERNAL_AUTH_SECRET;
        const headers = internalSecret ? { 'x-internal-auth': internalSecret } : {};

        // Forward only safe metadata to the redirect URI. The credential
        // secret/hash is never sent over the wire.
        const safeCred = {
            _id: cred._id,
            api_name: cred.api_name,
            api_url: cred.api_url,
            redirect_uri: cred.redirect_uri,
            client_id: cred.client_id
        };

        const callback_response = await axios.post(
            redirectUri,
            { creds: [safeCred], accessToken: token },
            { headers, timeout: 10_000, maxRedirects: 0 }
        );

        return res.status(200).json({
            success: callback_response.data.success,
            message: callback_response.data.message
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('ClientAuthorization error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during authorization'
        });
    }
};

module.exports = clientAuthorization;
