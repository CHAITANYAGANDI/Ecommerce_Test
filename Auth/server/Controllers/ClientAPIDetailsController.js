const CredentialModel = require('../Models/Credential');

const getAPIDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const credential = await CredentialModel.findById(id);

        if (!credential) {
            return res.status(404).json({
                success: false,
                message: 'Credential not found'
            });
        }

        if (!req.client || !req.client._id || credential.client.toString() !== String(req.client._id)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden'
            });
        }

        // Secrets are never returned — the plaintext only exists at
        // creation/rotation time. The hash stays server-side.
        res.status(200).json({
            success: true,
            credential: {
                _id: credential._id,
                api_name: credential.api_name,
                api_url: credential.api_url,
                redirect_uri: credential.redirect_uri,
                client_id: credential.client_id,
                creation_date: credential.creation_date
            }
        });
    } catch (error) {
        console.error('getAPIDetails error:', error.message);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching credential details'
        });
    }
};

module.exports = getAPIDetails;
