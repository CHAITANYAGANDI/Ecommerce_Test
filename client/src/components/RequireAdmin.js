import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchCurrentAdmin } from '../utils';

const RequireAdmin = ({ children }) => {
    const [state, setState] = useState({ loading: true, admin: null });

    useEffect(() => {
        let cancelled = false;
        fetchCurrentAdmin().then((admin) => {
            if (!cancelled) setState({ loading: false, admin });
        });
        return () => { cancelled = true; };
    }, []);

    if (state.loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card p-10 max-w-sm w-full text-center animate-fade-in">
                    <div className="w-10 h-10 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
                    <p className="mt-4 text-sm text-ink-500">Checking admin access…</p>
                </div>
            </div>
        );
    }
    if (!state.admin) return <Navigate to="/admin/login" replace />;
    return children;
};

export default RequireAdmin;
