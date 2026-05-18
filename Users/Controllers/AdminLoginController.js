const bcrypt = require('bcryptjs');
const UserModel = require("../Models/User");
const jwt = require('jsonwebtoken');
const { authCookieOptions } = require('../utils/cookieOptions');


const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;


const login = async (req, res) => {

    try {

        const { adminId, password } = req.body;

        const admin = await UserModel.findOne({ email: adminId });

        const errorMessage = 'Invalid Credentials';


        if (!admin || admin.role != 'Admin') {
            return res.status(403).json({ message: errorMessage, success: false });
        }

        const passwordComparison = await bcrypt.compare(password, admin.password);

        if (!passwordComparison) {
            return res.status(403).json({ message: errorMessage, success: false })
        }

        const accessToken = jwt.sign(
            { _id: admin._id, adminId: admin.email, name: admin.name, role: admin.role, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = jwt.sign(
            { _id: admin._id, adminId: admin.email, type: 'refresh-admin' },
            process.env.JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_TTL }
        );

        res.cookie('adminToken', accessToken, authCookieOptions(ACCESS_TOKEN_TTL_MS));
        res.cookie('adminRefreshToken', refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_MS));

        res.status(200).json({
            message: "Access Granted",
            success: true,
            admin: {
                adminId: admin.email,
                name: admin.name
            }
        })

    } catch (err) {
        res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
};


module.exports = login;
