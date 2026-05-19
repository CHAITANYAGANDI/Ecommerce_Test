// Fail-fast environment validation. Called once from app.js before any
// handler is registered. Required vars are stricter in production.

const REQUIRED_ALWAYS = ['MONGO_CONN', 'JWT_SECRET'];

const REQUIRED_PROD = [
    'JWT_PROVIDER_SECRET',
    'INTERNAL_AUTH_SECRET',
    'CORS_ORIGINS',
    'AUTH_CLIENT_URL'
];

const validateEnv = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const missing = [];

    for (const name of REQUIRED_ALWAYS) {
        if (!process.env[name]) missing.push(name);
    }
    if (isProd) {
        for (const name of REQUIRED_PROD) {
            if (!process.env[name]) missing.push(name);
        }
        // If a Google client is partly configured, both halves must be set.
        const hasGoogleId = !!process.env.GOOGLE_CLIENT_ID;
        const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
        if (hasGoogleId !== hasGoogleSecret) {
            missing.push('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (both required if either is set)');
        }
        // Brevo API key + verified sender are required in production —
        // without either, signup OTP and password-reset both fail closed.
        if (!process.env.BREVO_API_KEY) {
            missing.push('BREVO_API_KEY');
        }
        if (!process.env.MAIL_FROM) {
            missing.push('MAIL_FROM');
        }
    }

    if (missing.length) {
        // eslint-disable-next-line no-console
        console.error(
            `[auth-server] FATAL: missing required env vars: ${missing.join(', ')}. Refusing to start.`
        );
        process.exit(1);
    }

    // Defensive: JWT_SECRET should be substantial. Don't ship with the example value.
    if ((process.env.JWT_SECRET || '').length < 32 && isProd) {
        // eslint-disable-next-line no-console
        console.error('[auth-server] FATAL: JWT_SECRET is too short for production (need >=32 chars).');
        process.exit(1);
    }
};

module.exports = { validateEnv };
