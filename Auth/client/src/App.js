import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from 'react';
import CenterToast from "./components/CenterToast";
import AuthRegistration from "./components/AuthRegistration";
import AuthLogin from "./components/AuthLogin";
import AuthDashboard from "./components/AuthDashboard";
import AuthCredentials from "./components/AuthCredentials";
import AuthCredDetails from "./components/AuthCredDetails";
import AuthSettings from "./components/AuthSettings";
import AuthForgotPassword from "./components/AuthForgotPassword";
import AuthGoogleCallback from "./components/AuthGoogleCallback";
import AuthLanding from "./components/AuthLanding";
import RequireAuth from "./components/RequireAuth";
// import RefreshHandler from './RefreshHandler';

function App() {

    // const [isAuthenticated, setIsAuthenticated] = useState(false);

    // const PrivateRoute = ({ element }) => {
    //     return isAuthenticated ? element : <Navigate to="/login" />
    // }
    return (

        <div className="App">
          
          {/* <RefreshHandler setIsAuthenticated={setIsAuthenticated} /> */}
            <Routes>
                <Route path="/" element={<AuthLanding />} />
                <Route path="/auth/register" element={<AuthRegistration />} />
                <Route path="/auth/login" element={<AuthLogin />} />
                <Route path="/auth/dashboard" element={<RequireAuth><AuthDashboard /></RequireAuth>} />
                <Route path="/auth/credentials" element={<RequireAuth><AuthCredentials /></RequireAuth>} />
                <Route path="/auth/creds/:id" element={<RequireAuth><AuthCredDetails /></RequireAuth>} />
                <Route path="/auth/settings" element={<RequireAuth><AuthSettings /></RequireAuth>} />
                <Route path="/auth/forgot-password" element={<AuthForgotPassword />} />
                <Route path="/auth/google/callback" element={<AuthGoogleCallback />} />
            </Routes>
            <CenterToast />
        </div>

    );
}

export default App;
