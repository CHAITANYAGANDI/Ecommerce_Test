// ─── Toast + dialog event bus ──────────────────────────────────────────────
//
// The <CenterToast> and <ConfirmModal> components (mounted once at the App
// root) listen for these custom events. Using DOM events instead of a React
// context lets utility functions like `handleError` work from anywhere — no
// hook plumbing through every callsite.

const dispatchToast = (message, kind) => {
    if (typeof window === 'undefined' || !message) return;
    window.dispatchEvent(
        new CustomEvent('center-toast', {
            detail: {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                message,
                kind
            }
        })
    );
};

// Show a glass confirm modal. Returns a Promise<boolean>: true if the user
// clicked the confirm button, false if they clicked cancel / pressed Escape /
// clicked the backdrop. Replaces window.confirm everywhere in the storefront.
export const showConfirm = ({ title, body, confirmLabel, cancelLabel, danger } = {}) => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return new Promise((resolve) => {
        window.dispatchEvent(
            new CustomEvent('center-confirm', {
                detail: { title, body, confirmLabel, cancelLabel, danger, resolve }
            })
        );
    });
};

// ─── Friendly error sanitizer ─────────────────────────────────────────────
//
// Server-side and library errors often surface text users can't act on
// ("Token has expired", "ECONNREFUSED 127.0.0.1:7000", `"adminId" is required`).
// We map known technical patterns to friendly equivalents, clean up Joi-style
// field validation messages, and pass through anything that already reads
// like a user message.
const TECHNICAL_TO_FRIENDLY = [
    {
        match: /(token has expired|token verification failed|token signature|unauthorized:?\s*(admin\s+)?token|jwt expired)/i,
        friendly: 'Your session ended. Please sign in again.'
    },
    {
        match: /(econnrefused|failed to fetch|network\s*(request|error)?|networkerror)/i,
        friendly: "Can't reach the server right now. Please try again in a moment."
    },
    {
        match: /(internal server error|unexpected error|something went wrong)/i,
        friendly: 'Something went wrong on our end. Please try again.'
    },
    {
        match: /not allowed by cors|cross-?origin/i,
        friendly: 'Connection blocked. Please refresh the page and try again.'
    },
    {
        match: /too many requests|rate limit/i,
        friendly: "You're going a bit fast. Please slow down and try again."
    },
    {
        match: /service unavailable|upstream|bad gateway|gateway timeout/i,
        friendly: 'This service is temporarily unavailable. Please try again.'
    }
];

// Convert Joi-style field names ("adminId", "redirectUri") to readable labels.
const humanizeField = (name) =>
    name
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\bid\b/i, 'ID')
        .replace(/^./, (c) => c.toUpperCase());

// Joi messages look like:  "adminId" is required
//                          "password" is not allowed to be empty
//                          "email" must be a valid email
const cleanJoiMessage = (msg) => {
    const m = msg.match(/^"([^"]+)"\s+(.*)$/);
    if (!m) return null;
    return `${humanizeField(m[1])} ${m[2]}`;
};

export const friendlyError = (input) => {
    const raw =
        typeof input === 'string'
            ? input
            : (input && (input.message || input.error || input.toString())) || '';
    if (!raw) return 'Something went wrong. Please try again.';

    for (const { match, friendly } of TECHNICAL_TO_FRIENDLY) {
        if (match.test(raw)) return friendly;
    }
    const joi = cleanJoiMessage(raw);
    if (joi) return joi;

    // Last resort: if the message looks technical (contains stack-trace
    // markers, file paths, function names) hide it behind a generic.
    if (/at\s+\w+|\.js:\d+|\\node_modules\\|TypeError|ReferenceError/.test(raw)) {
        return 'Something went wrong. Please try again.';
    }
    return raw;
};

export const handleSuccess = (msg) => {
    if (!msg) return;
    dispatchToast(msg, 'success');
};

export const handleError = (input) => {
    const friendly = friendlyError(input);
    // Keep the original technical detail in the console for developers, but
    // never surface it to the user.
    if (typeof console !== 'undefined') console.error('[client]', input);
    dispatchToast(friendly, 'error');
};

export const handleCartClick = (navigate) => {
    navigate('/cart');
};

// Password policy - kept in sync with Users/utils/passwordPolicy.js.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const STRONG_PASSWORD_THRESHOLD = 3;
export const STRONG_PASSWORD_MESSAGE =
    'Password must be at least 8 characters and include uppercase, lowercase, and a digit.';

export const scorePassword = (pw = '') => {
    if (!pw) return 0;
    const hasMinLength = pw.length >= 8;
    const hasMixedCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);

    if (hasMinLength && hasMixedCase && hasDigit) {
        return hasSymbol ? 4 : 3;
    }

    let score = 0;
    if (pw.length >= 4) score += 1;
    if (hasMinLength || hasMixedCase || hasDigit || hasSymbol) score += 1;
    return Math.min(score, 2);
};

export const isStrongPassword = (pw) =>
    typeof pw === 'string' &&
    pw.length >= 8 &&
    pw.length <= 100 &&
    STRONG_PASSWORD_REGEX.test(pw);

const GATEWAY_URL = process.env.REACT_APP_API_URL || 'http://localhost:7000';
const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';

export const API_BASE = `${GATEWAY_URL}/api/${API_VERSION}/user`;
export const AMAZON_API = `${GATEWAY_URL}/api/${API_VERSION}/amazon/products`;
export const WALMART_API = `${GATEWAY_URL}/api/${API_VERSION}/walmart/products`;
export const AUTH_SERVER_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:5000';
export const CLIENT_URL = process.env.REACT_APP_CLIENT_URL || 'http://localhost:3001';

// Source-branded mock storefronts. Continue on Amazon / Continue on Walmart
// redirects here so the buyer perceives leaving TrendyTreasures and landing
// on the seller's own checkout, like Google Flights handing off to an
// airline. The redirect URL carries ONLY a referralCode — no PII or session
// crosses the boundary.
export const AMAZON_CHECKOUT_URL = process.env.REACT_APP_AMAZON_CHECKOUT_URL || 'http://localhost:8000/checkout';
export const WALMART_CHECKOUT_URL = process.env.REACT_APP_WALMART_CHECKOUT_URL || 'http://localhost:8001/checkout';

const sourceCheckoutBase = (source) =>
    source === 'amazon' ? AMAZON_CHECKOUT_URL : WALMART_CHECKOUT_URL;

// Creates a CheckoutIntent on TrendyTreasures (a referral record) and returns
// the public referralCode, which is then used as the only piece of state
// passed to the provider's checkout page.
export const createCheckoutIntent = async ({ provider, items }) => {
    const res = await apiFetch('/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, items })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create checkout intent.');
    }
    return res.json();
};

export const redirectToProviderCheckout = (source, referralCode) => {
    window.location.href = `${sourceCheckoutBase(source)}?ref=${encodeURIComponent(referralCode)}`;
};


// ─── Refresh-token plumbing ────────────────────────────────────────────────
//
// `apiFetch` wraps `fetch` so that any 401 response triggers a single call to
// `/auth/refresh`. If refresh succeeds (server rotates the cookies), the
// original request is retried once. Concurrent 401s share the same in-flight
// refresh promise so we only call /refresh once per burst.

let refreshInFlight = null;

const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const prefix = `${name}=`;
    return document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length) || null;
};

const withCsrfHeader = (options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return options;

    const csrfToken = getCookie('csrfToken');
    if (!csrfToken) return options;

    return {
        ...options,
        headers: {
            ...(options.headers || {}),
            'x-csrf-token': decodeURIComponent(csrfToken)
        }
    };
};

const tryRefresh = () => {
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${API_BASE}/auth/refresh`, withCsrfHeader({
            method: 'POST',
            credentials: 'include'
        }))
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
};

// Pages where we deliberately don't redirect even if a session call fails —
// they ARE the login/signup/recovery pages, so sending the user there from
// themselves would either be a no-op or an infinite loop.
const NON_REDIRECT_PATHS = [
    '/login',
    '/signup',
    '/forgotpassword',
    '/verifyotp',
    '/verify-signup',
    '/resetpassword',
    '/admin/login'
];

const isOnPublicAuthPage = () => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname;
    return NON_REDIRECT_PATHS.some((p) => path === p || path.startsWith(p + '/'));
};

const redirectToLogin = (url) => {
    if (typeof window === 'undefined') return;
    if (isOnPublicAuthPage()) return;
    // Admin endpoints send the user to the admin login; everything else to
    // the storefront login. Pick by URL pattern rather than caller-supplied
    // flag so we don't have to plumb a hint through every callsite.
    const target = /\/admin\b/.test(url) ? '/admin/login' : '/login';
    // replace so the back button doesn't bounce them right back into the
    // expired-session page.
    window.location.replace(target);
};

const fetchWithRefresh = async (url, options) => {
    const init = { credentials: 'include', ...withCsrfHeader(options) };
    let res = await fetch(url, init);

    // /auth/refresh and the *both* /auth/me + /admin/me endpoints exist so
    // we can check session state. They must NOT auto-refresh-and-retry (that
    // would either loop or hide the "not logged in" state from the caller).
    const isSessionProbe =
        url.endsWith('/auth/refresh') ||
        url.endsWith('/auth/me') ||
        url.endsWith('/admin/me');

    if (res.status === 401 && !isSessionProbe) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            res = await fetch(url, init);
            // If refresh succeeded but the retry still came back 401 the
            // refresh token must have been revoked between the two calls —
            // treat the same as refresh-failed and bounce to login.
            if (res.status === 401) redirectToLogin(url);
        } else {
            redirectToLogin(url);
        }
    }
    return res;
};


export const apiFetch = (path, options = {}) =>
    fetchWithRefresh(`${API_BASE}${path}`, options);

export const amazonFetch = (path, options = {}) =>
    fetchWithRefresh(`${AMAZON_API}${path}`, options);

export const walmartFetch = (path, options = {}) =>
    fetchWithRefresh(`${WALMART_API}${path}`, options);


export const fetchCurrentUser = async () => {
    try {
        const res = await apiFetch('/auth/me');
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.success ? data.user : null;
    } catch {
        return null;
    }
};

export const fetchCurrentAdmin = async () => {
    try {
        const res = await apiFetch('/admin/me');
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.success ? data.admin : null;
    } catch {
        return null;
    }
};

export const logoutUser = () => apiFetch('/auth/logout', { method: 'POST' });
export const logoutAdmin = () => apiFetch('/admin/logout', { method: 'POST' });


// ─── Price tracking ────────────────────────────────────────────────────────
//
// Buyers can track a product's price and get an email when it drops below
// their threshold. Snapshots are written by the gateway on every product-
// detail view (and by a GitHub Actions cron for unviewed products), so the
// history endpoint here just reads from MongoDB.

// Public — no auth needed. Days param is clamped server-side to [1, 365].
export const fetchPriceHistory = async (provider, productId, days = 30) => {
    try {
        const res = await fetch(
            `${API_BASE}/prices/${provider}/${encodeURIComponent(productId)}/history?days=${days}`,
            { credentials: 'include' }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.success ? data.snapshots : null;
    } catch {
        return null;
    }
};

// Upsert — same (buyer, provider, product_id) overwrites the threshold.
export const createPriceAlert = (payload) =>
    apiFetch('/prices/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

export const listPriceAlerts = () => apiFetch('/prices/alerts');

export const deletePriceAlert = (id) =>
    apiFetch(`/prices/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });


// ─── AI helpers ────────────────────────────────────────────────────────────
//
// Both AI endpoints are public (no auth) but live behind the gateway. Use
// plain fetch instead of apiFetch so a 503 ("AI unavailable" because key
// isn't set) doesn't trigger the 401-refresh-redirect plumbing.

export const fetchPriceAdvice = async (provider, productId) => {
    try {
        const res = await fetch(
            `${API_BASE}/ai/price-advice/${provider}/${encodeURIComponent(productId)}`,
            { credentials: 'include' }
        );
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, ...data };
    } catch (err) {
        return { ok: false, status: 0, message: err.message };
    }
};

export const askProductQuestion = async ({ provider, productId, product_name, product_description, product_features, product_price, question }) => {
    try {
        const res = await fetch(`${API_BASE}/ai/product-qa`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                product_id: productId,
                product_name,
                product_description,
                product_features,
                product_price,
                question
            })
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, ...data };
    } catch (err) {
        return { ok: false, status: 0, message: err.message };
    }
};


// ─── Guest cart (logged-out shopping) ─────────────────────────────────────
//
// While a user is signed out, "Add to cart" stores items in localStorage
// under a single GUEST_CART_KEY. When the user later logs in, mergeGuestCart
// walks the localStorage cart and posts each item to the server cart, then
// clears localStorage so the two views stay in sync.

const GUEST_CART_KEY = 'guestCart';

const safeParse = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
};

export const getGuestCart = () => {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? safeParse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
};

export const setGuestCart = (items) => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const clearGuestCart = () => {
    localStorage.removeItem(GUEST_CART_KEY);
};

export const addToGuestCart = (item) => {
    const cart = getGuestCart();
    const existing = cart.find((c) => c.productName === item.productName);
    if (existing) {
        existing.productQuantity = Number(existing.productQuantity) + Number(item.productQuantity);
    } else {
        cart.push({ ...item, _localId: Date.now() + Math.random() });
    }
    setGuestCart(cart);
    return cart;
};

export const updateGuestCartQuantity = (productName, productQuantity) => {
    const cart = getGuestCart().map((c) =>
        c.productName === productName ? { ...c, productQuantity: Number(productQuantity) } : c
    );
    setGuestCart(cart);
    return cart;
};

export const removeFromGuestCart = (productName) => {
    const cart = getGuestCart().filter((c) => c.productName !== productName);
    setGuestCart(cart);
    return cart;
};

export const mergeGuestCart = async () => {
    const items = getGuestCart();
    if (!items.length) return;
    for (const item of items) {
        try {
            await apiFetch('/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: item.productName,
                    productDescription: item.productDescription,
                    productImageUrl: item.productImageUrl,
                    productPrice: item.productPrice,
                    productQuantity: item.productQuantity,
                    productSoldBy: item.productSoldBy,
                    source: item.source,
                    providerProductId: item.providerProductId
                })
            });
        } catch (e) {
            console.warn('mergeGuestCart: failed to migrate item', item.productName, e.message);
        }
    }
    clearGuestCart();
};

export default handleCartClick;
