const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const clientSchema = new Schema({
    name:{
        type:String,
        required:true,
    },

    username:{
        type:String,
        required: true,
        unique: true
    },

    email:{
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        sparse: true
    },

    password:{
        type: String,
        required: function () {
            return !this.isGoogleUser;
        }
    },

    isGoogleUser: {
        type: Boolean,
        default: false
    },

    // Monotonic counter embedded in every JWT we sign for this user. Bumped
    // on password change, password reset, and admin "log out everywhere".
    // The refresh endpoint compares the JWT's `tv` claim against this value
    // and rejects stale tokens — so all sessions on all devices die the
    // moment the counter increments. Access tokens are accepted until they
    // expire on their own (≤15 min TTL).
    tokenVersion: {
        type: Number,
        default: 0
    }
})

const ClientModel = mongoose.model('clients',clientSchema);

module.exports = ClientModel;
