const mongoose = require('mongoose');
const CredentialModel = require('../Models/Credential');

const deleteCredential = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.clientId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid credential id' });
        }

        const deleted = await CredentialModel.findOneAndDelete({
            _id: id,
            client: req.clientId
        });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Credential not found' });
        }

        return res.status(200).json({ success: true, message: 'Credential deleted' });
    } catch (error) {
        console.error('deleteCredential error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete credential' });
    }
};

module.exports = deleteCredential;
