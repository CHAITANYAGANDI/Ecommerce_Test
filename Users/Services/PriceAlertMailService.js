const { sendBrevoMail } = require('./_brevoMail');

async function sendPriceDropEmail({ toEmail, productName, provider, previousPrice, currentPrice, thresholdPrice, productUrl }) {
    try {
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

        await sendBrevoMail({
            to: toEmail,
            subject: `Price drop: ${productName} is now $${currentPrice.toFixed(2)}`,
            text: lines.join('\n')
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = sendPriceDropEmail;
