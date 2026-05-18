const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require("../Models/User");
const sendMail = require('../Services/MailService');
const { authCookieOptions } = require('../utils/cookieOptions');


const PENDING_SIGNUP_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;


// Step 1 of registration. The user is NOT created here — we hash the password,
// stash it inside a short-lived `pendingSignup` JWT cookie, send a verification
// OTP, and wait. Step 2 (verifySignupOtp middleware) does the actual user
// insert once the OTP is confirmed. This keeps unverified emails out of the
// users collection entirely.
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await UserModel.findOne({ email });
        if (existing) {
            return res.status(409).json({
                message: "this email already exists",
                success: false
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const emailSentResponse = await sendMail(email);
        if (!emailSentResponse.success) {
            return res.status(500).json({
                message: "Failed to send verification email",
                success: false
            });
        }

        const pendingToken = jwt.sign(
            {
                name,
                email,
                hashedPassword,
                purpose: 'pending-signup'
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.cookie('pendingSignup', pendingToken, authCookieOptions(PENDING_SIGNUP_TTL_MS));

        return res.status(200).json({
            message: "We sent a verification code to your email. Enter it to finish creating your account.",
            success: true,
            email
        });

    } catch (err) {
        console.error('Signup error:', err.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Invalid input', success: false });
        }

        const user = await UserModel.findOne({ email });
        const errorMessage = 'Invalid Credentials';

        if (!user || !user.password) {
            return res.status(403).json({ message: errorMessage, success: false });
        }

        const passwordOk = await bcrypt.compare(password, user.password);
        if (!passwordOk) {
            return res.status(403).json({ message: errorMessage, success: false });
        }

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

        return res.status(200).json({
            message: "Login successful",
            success: true,
            user: { name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};


module.exports = {
    signup,
    login
};
