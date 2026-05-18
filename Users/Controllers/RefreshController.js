const jwt = require('jsonwebtoken');
const UserModel = require('../Models/User');
const { authCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');


const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;


const refreshUserSession = async (req, res, refreshToken) => {
    let payload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
        res.clearCookie('userToken', clearCookieOptions());
        res.clearCookie('userRefreshToken', clearCookieOptions());
        return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
    }

    if (payload.type !== 'refresh-user') {
        return res.status(401).json({ success: false, message: 'Invalid refresh token type' });
    }

    const user = await UserModel.findOne({ email: payload.email });
    if (!user) {
        res.clearCookie('userToken', clearCookieOptions());
        res.clearCookie('userRefreshToken', clearCookieOptions());
        return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    const newAccess = jwt.sign(
        { _id: user._id, email: user.email, name: user.name, role: user.role, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

    const newRefresh = jwt.sign(
        { _id: user._id, email: user.email, type: 'refresh-user' },
        process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL }
    );

    res.cookie('userToken', newAccess, authCookieOptions(ACCESS_TOKEN_TTL_MS));
    res.cookie('userRefreshToken', newRefresh, authCookieOptions(REFRESH_TOKEN_TTL_MS));

    return res.status(200).json({
        success: true,
        user: { name: user.name, email: user.email }
    });
};


const refreshAdminSession = async (req, res, refreshToken) => {
    let payload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
        res.clearCookie('adminToken', clearCookieOptions());
        res.clearCookie('adminRefreshToken', clearCookieOptions());
        return res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
    }

    if (payload.type !== 'refresh-admin') {
        return res.status(401).json({ success: false, message: 'Invalid refresh token type' });
    }

    const admin = await UserModel.findOne({ email: payload.adminId });
    if (!admin || admin.role !== 'Admin') {
        res.clearCookie('adminToken', clearCookieOptions());
        res.clearCookie('adminRefreshToken', clearCookieOptions());
        return res.status(401).json({ success: false, message: 'Admin no longer exists' });
    }

    const newAccess = jwt.sign(
        { _id: admin._id, adminId: admin.email, name: admin.name, role: admin.role, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

    const newRefresh = jwt.sign(
        { _id: admin._id, adminId: admin.email, type: 'refresh-admin' },
        process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL }
    );

    res.cookie('adminToken', newAccess, authCookieOptions(ACCESS_TOKEN_TTL_MS));
    res.cookie('adminRefreshToken', newRefresh, authCookieOptions(REFRESH_TOKEN_TTL_MS));

    return res.status(200).json({
        success: true,
        admin: { adminId: admin.email, name: admin.name }
    });
};


const refresh = async (req, res) => {
    try {
        const userRefresh = req.cookies && req.cookies.userRefreshToken;
        const adminRefresh = req.cookies && req.cookies.adminRefreshToken;

        if (userRefresh) {
            return refreshUserSession(req, res, userRefresh);
        }

        if (adminRefresh) {
            return refreshAdminSession(req, res, adminRefresh);
        }

        return res.status(401).json({ success: false, message: 'No refresh token' });
    } catch (err) {
        console.error('Refresh error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to refresh session' });
    }
};


module.exports = { refresh };
