const jwt = require('jsonwebtoken');

const extractToken = (req) => {
    if (req.cookies && req.cookies.authToken) return req.cookies.authToken;

    const authHeader = req.headers.authorization || "";
    if (!authHeader) return null;

    return authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
};

const verifyToken = (req, res, next) => {

    const token = extractToken(req);

    if (!token) return res.status(401).json({ message: 'Not authenticated' });


    try {
        // Pin the algorithm so a future key-type misconfiguration can't
        // open an alg-confusion gap. We only issue HS256 user tokens.
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });

        if (decoded.type !== 'access') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        req.clientId = decoded._id;
        req.client = decoded;

        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        res.status(401).json({ message: 'Invalid token' });
    }
};


module.exports = verifyToken;
