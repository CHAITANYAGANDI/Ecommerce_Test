const ClientsModel = require('../Models/Client');


const clientData = async (req, res) => {

    const { clientId, clientSecret, redirectUri } = req.body;

    if (typeof clientId !== 'string' || typeof clientSecret !== 'string' || typeof redirectUri !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    if (!req.user || !(req.user.adminId || req.user.email)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const adminEmail = req.user.adminId || req.user.email;

    try {

        await ClientsModel.findOneAndUpdate(
            { admin_email: adminEmail },
            {
                admin_email: adminEmail,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                created_at: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Client data saved successfully' });

    } catch (error) {
        console.error('Error saving client data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = clientData;
