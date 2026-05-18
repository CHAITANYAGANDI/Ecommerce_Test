const mongoose = require('mongoose');
const { Schema } = mongoose;

const credentialSchema = new Schema({
    client: {
        type: Schema.Types.ObjectId,
        ref: 'clients',
        required: true
    },
    api_name: {
        type: String,
        required: true
    },
    api_url: {
        type: String,
        required: true
    },
    redirect_uri: {
        type: String,
        required: true
    },
    // Public identifier — safe to expose. Stored in plaintext.
    client_id: {
        type: String,
        required: true,
        unique: true
    },
    // bcrypt hash of the client_secret. The plaintext value is shown to the
    // user exactly once at creation/rotation time and never retrievable again.
    client_secret_hash: {
        type: String,
        required: true,
        select: false
    },
    // jti of the most recently minted JWT for this credential. Downstream
    // services (Amazon/Walmart) call the introspection endpoint and reject
    // any token whose jti doesn't match this value — so re-authorizing or
    // refreshing implicitly revokes every prior token for this credential.
    // Null on credentials created before this field was introduced; those
    // skip the check until their first refresh.
    active_jti: {
        type: String,
        default: null,
        index: true
    },
    creation_date: {
        type: Date,
        default: Date.now
    }
});

// Uniqueness is scoped per client: the same user can't create two credentials
// with the same api_name, but different users can reuse names.
credentialSchema.index({ client: 1, api_name: 1 }, { unique: true });

const CredentialModel = mongoose.model('credentials', credentialSchema);

// Reconcile indexes on boot — drops the old global-unique indexes on
// api_name / client_secret / secret_key that existed in earlier schema versions.
CredentialModel.syncIndexes().catch((err) => {
    console.error('[auth-server] Credential.syncIndexes failed:', err.message);
});

module.exports = CredentialModel;
