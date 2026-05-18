const bcrypt = require('bcryptjs');
const CredentialModel = require('../Models/Credential');
const {
    generateClientId,
    generateClientSecret
} = require('../utils/generateUniqueIdentifiers');
const { isStaticallySafeUrl } = require('../utils/safeRedirect');

const BCRYPT_COST = 12;

const createCredential = async (req, res) => {
    try {
        const { api_name, api_url, redirect_uri } = req.body || {};

        if (!req.clientId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (typeof api_name !== 'string' ||
            typeof api_url !== 'string' ||
            typeof redirect_uri !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        // SSRF prevention: in production, refuse private IPs / .local
        // hostnames and require https://. In dev we accept any parseable
        // URL (including http://localhost) so the authorize flow can be
        // exercised end-to-end locally. The runtime SSRF check
        // re-validates before any outbound call in prod.
        if (!isStaticallySafeUrl(redirect_uri)) {
            return res.status(400).json({
                success: false,
                message: 'redirect_uri must be a valid URL (https + public host required in production)'
            });
        }
        if (!isStaticallySafeUrl(api_url)) {
            return res.status(400).json({
                success: false,
                message: 'api_url must be a valid URL (https + public host required in production)'
            });
        }

        const clientId = generateClientId();
        const clientSecret = generateClientSecret();
        const clientSecretHash = await bcrypt.hash(clientSecret, BCRYPT_COST);

        const newCredential = await CredentialModel.create({
            client: req.clientId,
            api_name,
            api_url,
            redirect_uri,
            client_id: clientId,
            client_secret_hash: clientSecretHash,
            creation_date: new Date()
        });

        // The plaintext client_secret is returned exactly once. We never store
        // it and we never return it again — if the user loses it, they must
        // rotate to get a fresh one.
        return res.status(201).json({
            success: true,
            message: 'Credentials created successfully',
            credential: {
                _id: newCredential._id,
                api_name: newCredential.api_name,
                api_url: newCredential.api_url,
                redirect_uri: newCredential.redirect_uri,
                client_id: newCredential.client_id,
                creation_date: newCredential.creation_date
            },
            client_id: clientId,
            client_secret: clientSecret
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You already have a credential with this API name. Pick a different name.'
            });
        }
        // eslint-disable-next-line no-console
        console.error('createCredential error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create credential' });
    }
};

module.exports = createCredential;
