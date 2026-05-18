const { clearCookieOptions } = require('../utils/cookieOptions');


const me = async (req, res) => {
    try {
        const user = req.user || {};

        if (user.aud) {
            return res.status(200).json({
                success: true,
                user: { name: user.name, email: user.email }
            });
        }

        res.status(200).json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load session' });
    }
};


const logout = (req, res) => {
    res.clearCookie('userToken', clearCookieOptions());
    res.clearCookie('userRefreshToken', clearCookieOptions());
    res.clearCookie('pendingSignup', clearCookieOptions());
    res.clearCookie('userData', clearCookieOptions());
    res.clearCookie('userInfo', clearCookieOptions());
    res.status(200).json({ success: true, message: 'Logged out' });
};


const adminMe = (req, res) => {
    const user = req.user || {};
    res.status(200).json({
        success: true,
        admin: {
            adminId: user.adminId,
            name: user.name
        }
    });
};


const adminLogout = (req, res) => {
    res.clearCookie('adminToken', clearCookieOptions());
    res.clearCookie('adminRefreshToken', clearCookieOptions());
    res.status(200).json({ success: true, message: 'Logged out' });
};


module.exports = { me, logout, adminMe, adminLogout };
