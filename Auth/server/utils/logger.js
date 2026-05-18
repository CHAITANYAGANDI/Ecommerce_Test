// Minimal structured logger. Emits one JSON object per line on stdout so
// downstream collectors (CloudWatch, GCP Logs, Datadog, etc.) can parse
// without a runtime dependency. Errors go to stderr.
//
// PII redaction: known sensitive query-string keys are stripped before
// the URL hits the log.

const SENSITIVE_QS_KEYS = new Set(['code', 'state', 'otp', 'token', 'password', 'client_secret']);

const redactUrl = (rawUrl) => {
    if (typeof rawUrl !== 'string') return rawUrl;
    const qIdx = rawUrl.indexOf('?');
    if (qIdx === -1) return rawUrl;
    const path = rawUrl.slice(0, qIdx);
    const params = new URLSearchParams(rawUrl.slice(qIdx + 1));
    for (const key of Array.from(params.keys())) {
        if (SENSITIVE_QS_KEYS.has(key.toLowerCase())) {
            params.set(key, '[redacted]');
        }
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
};

const emit = (level, msg, fields) => {
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        msg,
        ...(fields || {})
    });
    if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
};

module.exports = {
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
    redactUrl
};
