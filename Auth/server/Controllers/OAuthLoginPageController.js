const CredentialModel = require('../Models/Credential');

const isProd = () => process.env.NODE_ENV === "production";

// Allow callback URLs that point at any of the configured CORS origins (so
// the AuthRequest form on TrendyTreasures can pass its own React route). In
// dev we also accept any localhost/127.0.0.1 origin to keep local testing
// painless. This stops a third party from passing callbackUrl=evil.com.
const allowedOrigins = () =>
    (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isAllowedCallback = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && !isProd())) {
            return false;
        }
        const origin = `${parsed.protocol}//${parsed.host}`;
        if (allowedOrigins().includes(origin)) return true;
        if (!isProd() && localhostRegex.test(origin)) return true;
        return false;
    } catch {
        return false;
    }
};


const renderLoginPage = async (req, res) => {

    try {
        const clientId = req.query.client_id;
        const callbackUrl = req.query.callbackUrl;
        const viewData = { isAuthorizationFlow: true };

        if (typeof clientId !== 'string' || clientId.length === 0) {
            return res.status(400).render('login', { ...viewData, error: 'Missing client_id', callbackUrl: null });
        }

        const credential = await CredentialModel.findOne({ client_id: clientId });
        if (!credential) {
            return res.status(404).render('login', { ...viewData, error: 'Unknown client_id', callbackUrl: null });
        }

        res.cookie('client_id', clientId, {
            httpOnly: true,
            secure: isProd(),
            sameSite: isProd() ? "none" : "lax"
        });

        // Pass the (validated) callbackUrl to the template so it can be sent
        // back as a hidden form field on submit. We used to rely on a cookie
        // for this but that path was unreliable across same-origin POST in
        // some browser configurations — the hidden field is bullet-proof.
        const safeCallback =
            typeof callbackUrl === 'string' && callbackUrl.length > 0 && isAllowedCallback(callbackUrl)
                ? callbackUrl
                : null;

        res.render('login', { ...viewData, error: null, callbackUrl: safeCallback });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('OAuthLoginPage error:', err.message);
        res.status(500).render('login', {
            isAuthorizationFlow: true,
            error: 'Internal server error',
            callbackUrl: null
        });
    }
};

module.exports = renderLoginPage;
