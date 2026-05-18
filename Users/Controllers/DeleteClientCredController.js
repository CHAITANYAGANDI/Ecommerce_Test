const mongoose = require('mongoose');
const axios = require('axios');
const CredsModel = require('../Models/Credential');

const GATEWAY_URL = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL || 'http://localhost:7000';

const clearGatewayTokenCache = async (apiName) => {
    if (!apiName) return;

    try {
        const headers = {};
        if (process.env.INTERNAL_AUTH_SECRET) {
            headers['x-internal-auth'] = process.env.INTERNAL_AUTH_SECRET;
        }
        await axios.delete(
            `${GATEWAY_URL}/internal/token-cache/${encodeURIComponent(apiName)}`,
            { headers }
        );
    } catch (err) {
        console.warn(`Could not clear gateway token cache for ${apiName}:`, err.message);
    }
};

const deleteClientCred = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid credential id' });
        }

        const deleted = await CredsModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Credential not found' });
        }

        await clearGatewayTokenCache(deleted.api_name);

        return res.status(200).json({
            success: true,
            message: 'Authorized API deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting credential:', err.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting credential'
        });
    }
};

module.exports = deleteClientCred;
