const mongoose = require('mongoose');
const { Schema } = mongoose;

const clientSchema = new Schema({
    admin_email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    client_id: {
        type: String,
        required: true
    },
    client_secret: {
        type: String,
        required: true
    },
    redirect_uri: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        expires: 600
    }
});

const ClientModel = mongoose.model('temp_clients', clientSchema);

module.exports = ClientModel;
