// Fire a centre-screen glass-pill toast. The CenterToast component (rendered
// once at the App root) listens for this custom event. We use an event bus
// rather than a context/provider so utility callers don't need a hook —
// `handleSuccess('foo')` works the same way it always did, just with a
// different visual.
const dispatchToast = (message, kind) => {
    if (typeof window === 'undefined') return;
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

export const handleSuccess = (msg) => {
    if (!msg) return;
    console.log('[auth]', msg);
    dispatchToast(msg, 'success');
};

export const handleError = (msg) => {
    if (!msg) return;
    console.error('[auth]', msg);
    dispatchToast(msg, 'error');
};

// Password policy — kept in sync with Auth/server/utils/passwordPolicy.js.
// scorePassword(pw) returns 0..4; STRONG_PASSWORD_THRESHOLD is the minimum
// the server will accept (mixed case + digit + length 8+).
export const STRONG_PASSWORD_THRESHOLD = 3;
export const STRONG_PASSWORD_MESSAGE =
    'Password must be at least 8 characters and include uppercase, lowercase, and a digit.';

export const scorePassword = (pw = '') => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return score;
};

export const isStrongPassword = (pw) =>
    typeof pw === 'string' && scorePassword(pw) >= STRONG_PASSWORD_THRESHOLD;

// Username policy — kept in sync with Auth/server/utils/usernamePolicy.js.
export const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,28}[a-zA-Z0-9]$/;
export const USERNAME_MESSAGE =
    'Username must be 3-30 characters, start and end with a letter or digit, and may contain letters, digits, dots, underscores, or hyphens.';

export const isValidUsername = (u) =>
    typeof u === 'string' && USERNAME_REGEX.test(u);

export const AUTH_API_BASE = process.env.REACT_APP_AUTH_URL || 'http://localhost:5000/auth';


// Read the CSRF cookie value. The server sets `csrfToken` as a non-httpOnly
// cookie on login/refresh/me; we echo it back in the `x-csrf-token` header
// on every state-changing request. Cross-site attackers can't read this
// cookie value because of same-origin restrictions on document.cookie, so
// they can't forge the matching header — that's what stops CSRF even
// though the cookie itself is sent automatically by the browser.
const readCsrfToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Refresh-token plumbing — see client/src/utils.js for details.
let refreshInFlight = null;

const tryRefresh = () => {
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${AUTH_API_BASE}/refresh`, {
            method: 'POST',
            credentials: 'include'
        })
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
};


// Build a fetch init that adds the CSRF header to state-changing requests.
// We clone headers so callers can keep passing plain objects without us
// mutating them.
const withCsrf = (init) => {
    const method = (init.method || 'GET').toUpperCase();
    if (!STATE_CHANGING_METHODS.has(method)) return init;
    const token = readCsrfToken();
    if (!token) return init;
    const headers = new Headers(init.headers || {});
    if (!headers.has('x-csrf-token')) headers.set('x-csrf-token', token);
    return { ...init, headers };
};


export const authFetch = async (path, options = {}) => {
    const url = `${AUTH_API_BASE}${path}`;
    const init = withCsrf({ credentials: 'include', ...options });
    let res = await fetch(url, init);

    const isRefreshCall = path === '/refresh' || path === '/me';
    if (res.status === 401 && !isRefreshCall) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            // Re-read the CSRF token — /refresh issues a new one.
            res = await fetch(url, withCsrf({ credentials: 'include', ...options }));
        }
    }
    return res;
};


export const fetchCurrentClient = async () => {
    try {
        const res = await authFetch('/me');
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.success ? data.client : null;
    } catch {
        return null;
    }
};

export const logoutClient = () => authFetch('/logout', { method: 'POST' });
