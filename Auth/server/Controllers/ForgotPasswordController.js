const ClientModel = require('../Models/Client');
const { sendPasswordResetOtp } = require('../Services/MailService');

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        const normalized = email.toLowerCase().trim();

        const client = await ClientModel.findOne({ email: normalized });

        // Reveal nothing about whether the email exists. Only attempt to send
        // mail when we have a match; otherwise still respond 200 so an attacker
        // can't enumerate accounts. For Google-only accounts we also no-op —
        // there is no local password to reset.
        if (client && client.password) {
            const result = await sendPasswordResetOtp(normalized);
            if (!result.success) {
                // eslint-disable-next-line no-console
                console.warn('Forgot-password mail send failed:', result.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'If an account exists for that email, a reset code has been sent.'
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('forgotPassword error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to start password reset' });
    }
};

module.exports = forgotPassword;
