const crypto = require('crypto');

// Base64url-encode bytes (no padding, URL-safe alphabet).
const b64url = (bytes) => bytes.toString('base64url');

// Public identifier — safe to embed in URLs and client code.
// 16 random bytes → ~22 chars, prefixed for scanner-friendliness.
function generateClientId() {
    return `auth_id_${b64url(crypto.randomBytes(16))}`;
}

// Secret credential — high-entropy, prefixed so secret-scanning tools
// (GitHub Push Protection, TruffleHog, GitGuardian) can detect leaks.
// 32 random bytes → 256 bits of entropy, ~43 chars.
function generateClientSecret() {
    return `auth_sk_live_${b64url(crypto.randomBytes(32))}`;
}

module.exports = {
    generateClientId,
    generateClientSecret,
    // Backwards-compatible aliases for any older imports.
    generateUniqueId: generateClientId,
    generateUniqueSecret: generateClientSecret
};
