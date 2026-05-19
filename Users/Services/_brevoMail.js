const axios = require('axios');

// HTTPS-based mailer (Brevo). Used by signup OTP, password-reset OTP,
// and the price-drop notifier. We use Brevo because Render's free tier
// blocks outbound SMTP (so nodemailer/Gmail can't reach the wire) and
// Brevo's free tier allows single-sender verification (verify one email
// address by clicking a link) — no domain or DNS control required.
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Accept "Name <email>" or bare "email" in MAIL_FROM. Brevo's API takes
// sender as a structured { name, email } object — split it here.
const parseSender = (raw) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) return { name: match[1].trim(), email: match[2].trim() };
    return { name: trimmed, email: trimmed };
};

// Sends one transactional email via Brevo's REST API. Throws on failure;
// callers should catch and return their own {success:false,...} shape.
// Surfaces Brevo's API error message (e.g. "sender_not_valid",
// "unauthorized") on the thrown error so logs show the real reason
// instead of a generic "Request failed with status code 401".
const sendBrevoMail = async ({ to, subject, text }) => {
    if (!process.env.BREVO_API_KEY) {
        const err = new Error('BREVO_API_KEY not configured');
        err.expected = true;
        throw err;
    }
    const sender = parseSender(process.env.MAIL_FROM);
    if (!sender) {
        const err = new Error('MAIL_FROM not configured');
        err.expected = true;
        throw err;
    }
    try {
        await axios.post(
            BREVO_ENDPOINT,
            {
                sender,
                to: [{ email: to }],
                subject,
                textContent: text
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json',
                    'accept': 'application/json'
                },
                timeout: 10000
            }
        );
    } catch (err) {
        const apiMessage = err.response && err.response.data && err.response.data.message;
        if (apiMessage) {
            const wrapped = new Error(apiMessage);
            wrapped.status = err.response.status;
            throw wrapped;
        }
        throw err;
    }
};

module.exports = { sendBrevoMail };
