import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Signin from "./components/Signin";
import Signup from "./components/Signup";
import Home from "./components/Home";
import RefreshHandler from './RefreshHandler';
import GoogleCallback from './components/GoogleCallBack';
import ForgotPassword from './components/ForgotPassword';
import VerifyOtp from './components/VerifyOtp';
import ResetPassword from './components/ResetPassword';
import VerifySignupOtp from './components/VerifySignupOtp';
import AdminLogin from "./components/AdminLogin";
import AdminRegistration from "./components/AdminRegistration";
import AdminDashboard from "./components/AdminDashboard";
import AuthManagement from "./components/AuthManagement";
import AuthRequest from "./components/AuthRequest";
import ProtectedRoutes from "./components/ProtectedRoutes";
import ClientCallBack from "./components/ClientCallBack";
import ProductDetails from "./components/ProductDetails";
import Cart from './components/Cart';
import MyAlerts from './components/MyAlerts';
import UserManagement from './components/UserManagement';
import RequireAdmin from './components/RequireAdmin';
import CenterToast from './components/CenterToast';
import ConfirmModal from './components/ConfirmModal';


function App() {

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    return (

        <div className="App">

            <RefreshHandler setIsAuthenticated={setIsAuthenticated} />
            <CenterToast />
            <ConfirmModal />
            <Routes>
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/login" element={<Signin />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/product/:source/:productId" element={<ProductDetails />} />
                <Route path="/home" element={<Home />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/alerts" element={<MyAlerts />} />

                <Route path="/auth/google/callback" element={<GoogleCallback />} />
                <Route path="/verify-signup" element={<VerifySignupOtp />} />
                <Route path="/forgotpassword" element={<ForgotPassword />} />
                <Route path="/verifyotp" element={<VerifyOtp />} />
                <Route path="/resetpassword" element={<ResetPassword />} />


                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/register" element={<RequireAdmin><AdminRegistration /></RequireAdmin>} />
                <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/admin/auth" element={<RequireAdmin><AuthManagement /></RequireAdmin>} />
                <Route path="/admin/auth/request" element={<RequireAdmin><AuthRequest /></RequireAdmin>} />
                <Route path="/admin/auth/protected" element={<RequireAdmin><ProtectedRoutes /></RequireAdmin>} />
                <Route path="/admin/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
                <Route path="/admin/client/callback" element={<RequireAdmin><ClientCallBack /></RequireAdmin>} />
            </Routes>

        </div>
    );
}

export default App;
