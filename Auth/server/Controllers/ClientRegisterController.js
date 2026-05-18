const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ClientModel = require('../Models/Client');
const { sendSignupOtp } = require('../Services/MailService');
const { authCookieOptions } = require('../utils/cookieOptions');

const BCRYPT_COST = 12;
const PENDING_SIGNUP_TTL = '10m';
const PENDING_SIGNUP_TTL_MS = 10 * 60 * 1000;

// Step 1 of registration. The user is NOT created here — we hash the password,
// stash the pending profile inside a short-lived `pendingSignup` JWT cookie,
// send a 6-digit verification OTP, and wait. Step 2 (verifySignupOtp middleware
// at POST /register/verify) does the actual Client insert once the OTP is
// confirmed. This keeps unverified emails out of the clients collection
// entirely and forces email ownership proof before an account exists.
const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        const existing = await ClientModel.findOne({
            $or: [{ username }, { email: normalizedEmail }]
        });

        if (existing) {
            // Don't reveal which field collided — that would let an attacker
            // enumerate registered emails. Always return the same generic
            // 409 regardless of whether the username or the email matched.
            return res.status(409).json({
                message: 'An account with these details already exists',
                success: false
            });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

        const mailResult = await sendSignupOtp(normalizedEmail);
        if (!mailResult.success) {
            return res.status(500).json({
                message: 'Failed to send verification email. Please try again.',
                success: false
            });
        }

        // Sign the full pending profile into a short-lived cookie so the
        // server stays stateless between /register and /register/verify.
        // The cookie holds the bcrypt hash, never the plaintext password.
        const pendingToken = jwt.sign(
            {
                name,
                username,
                email: normalizedEmail,
                passwordHash,
                purpose: 'pending-signup'
            },
            process.env.JWT_SECRET,
            { expiresIn: PENDING_SIGNUP_TTL }
        );

        res.cookie('pendingSignup', pendingToken, authCookieOptions(PENDING_SIGNUP_TTL_MS));

        return res.status(200).json({
            message: 'We sent a verification code to your email. Enter it to finish creating your account.',
            success: true,
            email: normalizedEmail
        });

    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({
                message: 'An account with these details already exists',
                success: false
            });
        }
        // eslint-disable-next-line no-console
        console.error('register error:', err.message);
        return res.status(500).json({
            message: 'Internal server error',
            success: false
        });
    }
};

module.exports = register;
