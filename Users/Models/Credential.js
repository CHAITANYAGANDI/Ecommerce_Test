const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const credsSchema = new Schema({
    client_id: {
        type: String,
        required: true,
        index: true
    },
    api_name: {
        type: String,
        required: true,
        index: true
    },
    api_url: {
        type: String,
        required: true
    },
    access_token: {
        type: String,
        required: true
    }
});

credsSchema.index({ client_id: 1, api_name: 1 }, { unique: true });

const CredsModel = mongoose.model('creds', credsSchema);

module.exports = CredsModel;
