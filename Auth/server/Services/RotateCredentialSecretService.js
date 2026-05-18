const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const CredentialModel = require('../Models/Credential');
const { generateClientSecret } = require('../utils/generateUniqueIdentifiers');

const rotateCredentialSecret = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.clientId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid credential id' });
        }

        const newSecret = generateClientSecret();
        const newSecretHash = await bcrypt.hash(newSecret, 12);

        const updated = await CredentialModel.findOneAndUpdate(
            { _id: id, client: req.clientId },
            { client_secret_hash: newSecretHash },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Credential not found' });
        }

        // Plaintext value is returned exactly once. The previous secret stops
        // working immediately because its hash has been overwritten.
        return res.status(200).json({
            success: true,
            message: 'Secret rotated',
            client_secret: newSecret
        });
    } catch (error) {
        console.error('rotateCredentialSecret error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to rotate secret' });
    }
};

module.exports = rotateCredentialSecret;
