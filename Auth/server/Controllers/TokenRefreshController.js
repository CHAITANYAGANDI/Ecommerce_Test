const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const CredentialModel = require('../Models/Credential');
const { signProviderToken } = require('../utils/tokens');

/**
 * Server-to-server endpoint: re-issues a fresh JWT for an existing credential
 * without requiring the original client_secret (or an admin re-login).
 *
 * Trust model — asymmetric JWT bearer (RFC 7523 JWT Bearer Token Profile):
 *   1. The caller (APIGateway) signs a short-lived assertion JWT with its
 *      PRIVATE key. The assertion carries iss/aud/jti/exp + the client_id
 *      it wants a refreshed token for.
 *   2. This server verifies the signature with the gateway's PUBLIC key
 *      stored in GATEWAY_PUBLIC_KEY. Only the holder of the private key
 *      could have produced a valid signature.
 *   3. Reading this server's env vars does NOT enable token minting —
 *      the public key can only verify, not sign. That's the whole reason
 *      we use asymmetric instead of a shared secret.
 *
 * Replay protection: every assertion includes a jti (random ID). We keep
 * the last N jtis seen in memory and reject duplicates. Combined with the
 * short exp, this stops anyone who intercepts an assertion from using it
 * twice.
 */

const CLIENT_TOKEN_TTL = process.env.CLIENT_TOKEN_TTL || '30d';
const TRUSTED_ISSUERS = (process.env.TRUSTED_ISSUERS || 'apigateway')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const AUDIENCE = 'auth-server';

const parseKey = (raw) => (raw ? raw.replace(/\\n/g, '\n') : null);
const GATEWAY_PUBLIC_KEY = parseKey(process.env.GATEWAY_PUBLIC_KEY);

// Tiny LRU for replay protection. jti's are random per-request, expire
// after the assertion's own exp (≤ 60s), so the set never grows large.
const seenJtis = new Map();
const SEEN_JTI_MAX = 5000;
const remember = (jti, exp) => {
    if (seenJtis.size >= SEEN_JTI_MAX) {
        const firstKey = seenJtis.keys().next().value;
        seenJtis.delete(firstKey);
    }
    seenJtis.set(jti, exp);
};
const isReplay = (jti) => {
    if (!seenJtis.has(jti)) return false;
    // Purge expired entries on access
    const exp = seenJtis.get(jti);
    if (exp * 1000 < Date.now()) {
        seenJtis.delete(jti);
        return false;
    }
    return true;
};


const refreshProviderToken = async (req, res) => {
    if (!GATEWAY_PUBLIC_KEY) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] ✗ GATEWAY_PUBLIC_KEY is not set — refusing to issue tokens.');
        return res.status(503).json({ success: false, message: 'Refresh endpoint disabled (GATEWAY_PUBLIC_KEY unset).' });
    }

    // 1. Extract assertion JWT from Authorization: Bearer header
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Bearer token required' });
    }
    const assertion = authHeader.slice(7);

    // 2. Verify signature + standard claims with gateway's public key
    let claims;
    try {
        claims = jwt.verify(assertion, GATEWAY_PUBLIC_KEY, {
            algorithms: ['RS256'],
            audience: AUDIENCE,
            issuer: TRUSTED_ISSUERS,
            maxAge: '90s'
        });
    } catch (err) {
        return res.status(401).json({ success: false, message: `Assertion invalid: ${err.message}` });
    }

    // 3. Replay protection
    if (!claims.jti) {
        return res.status(401).json({ success: false, message: 'Assertion must include jti' });
    }
    if (isReplay(claims.jti)) {
        return res.status(401).json({ success: false, message: 'Replay detected' });
    }
    remember(claims.jti, claims.exp);

    // 4. Mint the provider JWT
    const client_id = claims.client_id;
    if (typeof client_id !== 'string' || client_id.length === 0) {
        return res.status(400).json({ success: false, message: 'client_id claim required in assertion' });
    }

    try {
        const cred = await CredentialModel.findOne({ client_id });
        if (!cred) {
            return res.status(404).json({ success: false, message: 'Unknown credential' });
        }

        // Stamp a fresh jti on the credential so the previous JWT is treated
        // as superseded by the introspection check in downstream services.
        const jti = randomUUID();
        const accessToken = signProviderToken(
            {
                client_id: cred.client_id,
                api_name: cred.api_name,
                api_url: cred.api_url,
                type: 'client-access',
                jti
            },
            CLIENT_TOKEN_TTL
        );

        cred.active_jti = jti;
        await cred.save();

        return res.status(200).json({
            success: true,
            accessToken,
            api_name: cred.api_name,
            api_url: cred.api_url,
            expiresIn: CLIENT_TOKEN_TTL
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] ✗ refreshProviderToken failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to refresh token' });
    }
};

module.exports = refreshProviderToken;
