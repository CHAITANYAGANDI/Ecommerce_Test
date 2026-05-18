const jwt = require('jsonwebtoken');
const { getOtpRecord, incrementAttempts, deleteOtp, MAX_ATTEMPTS } = require('../Services/OtpService');
const UserModel = require("../Models/User");
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');


const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;


// Step 2 of registration. AuthController.signup deferred user creation behind a
// `pendingSignup` JWT cookie + a 4-digit email OTP. Once the user submits the
// correct OTP, this handler:
//   1. Validates the pending cookie and OTP
//   2. Creates the User record from the data stashed in the JWT
//   3. Issues userToken + userRefreshToken cookies (auto-login)
//   4. Clears the pendingSignup cookie
const verifySignupOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (typeof otp !== 'string' && typeof otp !== 'number') {
            return res.status(400).json({ message: "OTP is required", success: false });
        }

        const pending = req.cookies && req.cookies.pendingSignup;
        if (!pending) {
            return res.status(401).json({
                message: "No pending signup. Please register again.",
                success: false
            });
        }

        let pendingPayload;
        try {
            pendingPayload = jwt.verify(pending, process.env.JWT_SECRET);
        } catch (err) {
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(401).json({
                message: "Signup session expired. Please register again.",
                success: false
            });
        }

        if (pendingPayload.purpose !== 'pending-signup') {
            return res.status(400).json({ message: "Invalid pending session", success: false });
        }

        const { name, email, hashedPassword } = pendingPayload;

        const record = await getOtpRecord(email, 'signup');
        if (!record) {
            return res.status(400).json({
                message: "OTP expired. Please register again.",
                success: false
            });
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            await deleteOtp(email, 'signup');
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(429).json({
                message: "Too many failed attempts. Please register again.",
                success: false
            });
        }

        if (record.otp !== parseInt(otp, 10)) {
            await incrementAttempts(email, 'signup');
            return res.status(400).json({
                message: "Invalid OTP",
                success: false
            });
        }

        // OTP matched — verify the email isn't taken (race protection between
        // signup-step-1 and verification) and create the user.
        const existing = await UserModel.findOne({ email });
        if (existing) {
            await deleteOtp(email, 'signup');
            res.clearCookie('pendingSignup', clearCookieOptions());
            return res.status(409).json({
                message: "this email already exists",
                success: false
            });
        }

        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword
        });

        await deleteOtp(email, 'signup');

        const accessToken = jwt.sign(
            { _id: user._id, email: user.email, name: user.name, role: user.role, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = jwt.sign(
            { _id: user._id, email: user.email, type: 'refresh-user' },
            process.env.JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_TTL }
        );

        res.cookie('userToken', accessToken, authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('userRefreshToken', refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_MS));
        res.clearCookie('pendingSignup', clearCookieOptions());

        return res.status(200).json({
            message: "Email verified — welcome to Trendy Treasures!",
            success: true,
            user: { name: user.name, email: user.email }
        });

    } catch (err) {
        console.error("Error during signup OTP verification:", err.message);
        return res.status(500).json({
            message: "An unexpected error occurred during verification",
            success: false
        });
    }
};

module.exports = verifySignupOtp;
