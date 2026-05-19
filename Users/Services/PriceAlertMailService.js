const { Resend } = require('resend');

// Reuses the same Resend API key used by the signup OTP mailer.
const SANDBOX_SENDER = 'Trendy Treasures <onboarding@resend.dev>';

let cachedClient = null;
const getClient = () => {
    if (!cachedClient) {
        cachedClient = new Resend(process.env.RESEND_API_KEY);
    }
    return cachedClient;
};

async function sendPriceDropEmail({ toEmail, productName, provider, previousPrice, currentPrice, thresholdPrice, productUrl }) {
    try {
        if (!process.env.RESEND_API_KEY) {
            return { success: false, error: 'RESEND_API_KEY not configured' };
        }

        const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
        const dropAmount = (previousPrice - currentPrice).toFixed(2);

        const lines = [
            `Hi,`,
            ``,
            `The price you're tracking has dropped on ${providerLabel}:`,
            ``,
            `  ${productName}`,
            `  was $${previousPrice.toFixed(2)} — now $${currentPrice.toFixed(2)} (saved $${dropAmount})`,
            `  your alert threshold: $${thresholdPrice.toFixed(2)}`,
            ``
        ];
        if (productUrl) {
            lines.push(`View on TrendyTreasures: ${productUrl}`);
            lines.push(``);
        }
        lines.push(`You'll only get one email per drop — we won't re-notify within 24 hours.`);

        const { error } = await getClient().emails.send({
            from: process.env.MAIL_FROM || SANDBOX_SENDER,
            to: toEmail,
            subject: `Price drop: ${productName} is now $${currentPrice.toFixed(2)}`,
            text: lines.join('\n')
        });

        if (error) {
            return { success: false, error: error.message || error.name };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = sendPriceDropEmail;
