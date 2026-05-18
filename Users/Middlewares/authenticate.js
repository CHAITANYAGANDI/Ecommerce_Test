const axios = require('axios');
const ClientsModel = require('../Models/Client');


const authenticate = async (req, res) => {

    try {

        const { username } = req.body;

        if (typeof username !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        if (!req.user || !(req.user.adminId || req.user.email)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const adminEmail = req.user.adminId || req.user.email;

        const retrievedDoc = await ClientsModel.findOne({ admin_email: adminEmail });

        if (!retrievedDoc) {
            return res.status(404).json({
                success: false,
                message: 'No client registration found for this admin. Please submit client details first.'
            });
        }

        const formattedDoc = {
            clientId: retrievedDoc.client_id,
            clientSecret: retrievedDoc.client_secret,
            redirectUri: retrievedDoc.redirect_uri
        };

        await ClientsModel.deleteOne({ _id: retrievedDoc._id });

        const { clientId, clientSecret, redirectUri } = formattedDoc;

        const authServerUrl = process.env.AUTH_SERVER_URL || 'http://localhost:5000';

        const response = await axios.post(
            `${authServerUrl}/auth/authorize`,
            { clientId, clientSecret, redirectUri, username },
            { headers: { 'Content-Type': 'application/json' } }
        );

        return res.status(200).json({
            success: response.data.success,
            message: response.data.message
        });

    } catch (err) {
        console.error('Error during authentication:', err.message);

        if (err.response) {
            return res.status(err.response.status || 500).json({
                success: false,
                message: `Authorization service error: ${err.response.data && err.response.data.message ? err.response.data.message : 'An error occurred'}`
            });
        }

        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred during authentication'
        });
    }
};

module.exports = authenticate;
