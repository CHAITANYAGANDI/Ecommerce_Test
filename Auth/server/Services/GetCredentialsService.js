const CredentialModel = require('../Models/Credential');

const getCredentials = async (req, res) => {
    try {
        const credentials = await CredentialModel
            .find({ client: req.clientId })
            .select('api_name api_url redirect_uri client_id creation_date')
            .sort({ creation_date: -1 });

        res.json({ success: true, credentials });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch credentials' });
    }
};

module.exports = getCredentials;


