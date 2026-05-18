const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = '15m';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ALG = 'HS256';

// User access/refresh tokens. `tv` is the per-client tokenVersion — when
// the client doc's counter is bumped, all previously-issued refresh JWTs
// stop being honored at the refresh endpoint. We pin algorithm=HS256 on
// both signing and verification.
const signAccessToken = (client) =>
    jwt.sign(
        {
            _id: client._id,
            username: client.username,
            name: client.name,
            tv: client.tokenVersion || 0,
            type: 'access'
        },
        process.env.JWT_SECRET,
        { algorithm: ALG, expiresIn: ACCESS_TOKEN_TTL }
    );

const signRefreshToken = (client) =>
    jwt.sign(
        {
            _id: client._id,
            username: client.username,
            tv: client.tokenVersion || 0,
            type: 'refresh-client'
        },
        process.env.JWT_SECRET,
        { algorithm: ALG, expiresIn: REFRESH_TOKEN_TTL }
    );

// Provider tokens (machine-to-machine) are signed with a SEPARATE secret
// so a leak of one trust domain doesn't contaminate the other.
const PROVIDER_ALG = 'HS256';
const providerSecret = () => process.env.JWT_PROVIDER_SECRET || process.env.JWT_SECRET;

const signProviderToken = (claims, ttl) =>
    jwt.sign(claims, providerSecret(), {
        algorithm: PROVIDER_ALG,
        expiresIn: ttl
    });

module.exports = {
    ACCESS_TOKEN_TTL,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL,
    REFRESH_TOKEN_TTL_MS,
    signAccessToken,
    signRefreshToken,
    signProviderToken,
    providerSecret,
    USER_ALG: ALG,
    PROVIDER_ALG
};
