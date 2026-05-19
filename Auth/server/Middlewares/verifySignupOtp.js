const jwt = require('jsonwebtoken');
const ClientModel = require('../Models/Client');
const {
    getOtpRecord,
    compareOtp,
    incrementAttempts,
    deleteOtp,
    MAX_ATTEMPTS
} = require('../Services/OtpService');
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');
const {
    signAccessToken,
    signRefreshToken,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS
} = require('../utils/tokens');
const { issueCsrfToken } = require('./csrf');


// Step 2 of registration. ClientRegisterController.register deferred Client
// creation behind a `pendingSignup` JWT cookie + a 6-digit email OTP. Once the
// user submits the correct OTP, this handler:
//   1. Validates the pendingSignup cookie (must be unexpired + correct purpose)
//   2. Looks up + validates the OTP record (TTL, attempt counter, bcrypt match)
//   3. Creates the Client from the data stashed in the JWT (race-safe against
//      a parallel signup with the same email/username)
//   4. Issues authToken + authRefreshToken cookies + a CSRF token (auto-login)
//   5. Clears the pendingSignup cookie + deletes the OTP record
const verifySignupOtp = async (req, res) => {
    try {
        const { otp } = req.body || {};

        if (typeof otp !== 'string' && typeof otp !== 'number') {
            return res.status(400).json({ message: 'Verification code is required', success: false });
        }

        const pending = req.cookies && req.cookies.pendingSignup;
        if (!pending) {
            return res.status(401).json({
                message: 'No pending signup. Please register again.',
                success: false
            });
        }

        let pendingPayload;
        try {
            pendingPayload = jwt.verify(pending, process.env.JWT_SECRET);
        } catch (err) {
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(401).json({
                message: 'Signup session expired. Please register again.',
                success: false
            });
        }

        if (pendingPayload.purpose !== 'pending-signup') {
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(400).json({ message: 'Invalid pending session', success: false });
        }

        const { name, username, email, passwordHash } = pendingPayload;
        const normalizedEmail = String(email || '').toLowerCase().trim();

        const record = await getOtpRecord(normalizedEmail, 'signup');
        if (!record) {
            return res.status(400).json({
                message: 'Verification code expired. Please register again.',
                success: false
            });
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            await deleteOtp(normalizedEmail, 'signup');
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(429).json({
                message: 'Too many incorrect attempts. Please register again.',
                success: false
            });
        }

        const matches = await compareOtp(otp, record);
        if (!matches) {
            const attempts = await incrementAttempts(normalizedEmail, 'signup');
            const remaining = MAX_ATTEMPTS - (attempts ?? MAX_ATTEMPTS);
            return res.status(400).json({
                message: `Incorrect code. ${Math.max(0, remaining)} attempt(s) remaining.`,
                success: false
            });
        }

        // OTP matched — re-verify uniqueness before creating the row. Closes
        // the race where two parallel signups for the same email/username both
        // pass the step-1 existence check.
        const existing = await ClientModel.findOne({
            $or: [{ username }, { email: normalizedEmail }]
        });
        if (existing) {
            await deleteOtp(normalizedEmail, 'signup');
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(409).json({
                message: 'An account with these details already exists',
                success: false
            });
        }

        let client;
        try {
            client = await ClientModel.create({
                name,
                username,
                email: normalizedEmail,
                password: passwordHash
            });
        } catch (err) {
            // Unique-index collision (race with another concurrent verify).
            if (err && err.code === 11000) {
                await deleteOtp(normalizedEmail, 'signup');
                res.clearCookie('pendingSignup', clearCookieOptions());
                return res.status(409).json({
                    message: 'An account with these details already exists',
                    success: false
                });
            }
            throw err;
        }

        await deleteOtp(normalizedEmail, 'signup');

        res.cookie('authToken', signAccessToken(client), authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('authRefreshToken', signRefreshToken(client), authCookieOptions(REFRESH_TOKEN_TTL_MS));
        res.clearCookie('pendingSignup', clearCookieOptions());
        // Return the CSRF token in the body so the SPA can cache it —
        // cross-registrable-domain deploys can't read it from
        // document.cookie. See SessionController.me for full rationale.
        const csrfToken = issueCsrfToken(res);

        return res.status(200).json({
            message: 'Email verified — welcome to AuthShield!',
            success: true,
            client: { name: client.name, username: client.username },
            csrfToken
        });

    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('verifySignupOtp error:', err.message);
        return res.status(500).json({
            message: 'An unexpected error occurred during verification',
            success: false
        });
    }
};

module.exports = verifySignupOtp;
