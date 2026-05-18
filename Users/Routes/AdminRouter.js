const express = require("express");
const router = express.Router();

const registerAdmin = require('../Controllers/AdminRegisterController');
const UserModel = require('../Models/User');

const loginAdmin = require('../Controllers/AdminLoginController');

const {signupValidation,loginvalidation} = require('../Middlewares/adminCredsValidation');

const { ensureAdminAuthorized } = require('../Middlewares/Authorization');

const authenticate = require('../Middlewares/authenticate');

const auth = require('../Middlewares/authCallback');

const getCreds = require('../Controllers/ClientCredsController');

const deleteClientCred = require('../Controllers/DeleteClientCredController');

const clientData = require('../Controllers/ClientDetailsController');

const token = require('../Controllers/TokenController');

const {getAllUsers,deleteUserById}  = require('../Controllers/UserController');

const { adminMe, adminLogout } = require('../Controllers/SessionController');


const allowFirstAdminOrAuthorized = async (req, res, next) => {
    try {
        const adminExists = await UserModel.exists({ role: 'Admin' });
        if (!adminExists) return next();
        return ensureAdminAuthorized(req, res, next);
    } catch (err) {
        console.error('Admin bootstrap check failed:', err.message);
        return res.status(500).json({ success: false, message: 'Could not verify admin bootstrap state' });
    }
};

router.post('/login',loginvalidation,loginAdmin);

router.get('/me', ensureAdminAuthorized, adminMe);

router.post('/logout', adminLogout);

router.post('/register',signupValidation,allowFirstAdminOrAuthorized,registerAdmin);

router.post('/auth',ensureAdminAuthorized,authenticate);

router.get('/client/creds',ensureAdminAuthorized,getCreds);

router.delete('/client/creds/:id',ensureAdminAuthorized,deleteClientCred);

router.post('/auth/callback',auth);

router.post('/client/details',ensureAdminAuthorized,clientData);

router.get('/token',ensureAdminAuthorized,token);

router.get('/users/get',ensureAdminAuthorized,getAllUsers);

router.delete('/users/delete/:userId',ensureAdminAuthorized,deleteUserById);


module.exports = router;

