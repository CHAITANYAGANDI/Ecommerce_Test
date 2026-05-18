const bcrypt = require('bcryptjs');
const ClientModel = require("../Models/Client");

const BCRYPT_COST = 12;

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

        const salt = await bcrypt.genSalt(BCRYPT_COST);
        const passwordHash = await bcrypt.hash(password, salt);

        const clientModel = new ClientModel({
            name,
            username,
            email: normalizedEmail,
            password: passwordHash
        });

        await clientModel.save();

        res.status(201).json({
            message: "Registered Successfully",
            success: true
        });

    }

    catch (err) {
        if (err && err.code === 11000) {
            return res.status(409).json({
                message: 'An account with these details already exists',
                success: false
            });
        }
        res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}

module.exports = register;
