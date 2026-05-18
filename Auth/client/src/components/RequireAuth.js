import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchCurrentClient } from '../utils';

function RequireAuth({ children }) {
    const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'unauthed'
    const location = useLocation();

    useEffect(() => {
        let mounted = true;
        (async () => {
            const client = await fetchCurrentClient();
            if (!mounted) return;
            setStatus(client ? 'authed' : 'unauthed');
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (status === 'checking') {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#11131b',
                    color: '#c3c6d6',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '14px'
                }}
            >
                Checking your session…
            </div>
        );
    }

    if (status === 'unauthed') {
        return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}

export default RequireAuth;
