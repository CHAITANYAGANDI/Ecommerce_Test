import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentClient } from '../utils';

const ACCENT = '#426fe7';

function AuthGoogleCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const body = document.body;
        const root = document.getElementById('root');
        const prev = {
            bodyDisplay: body.style.display,
            bodyAlignItems: body.style.alignItems,
            bodyJustifyContent: body.style.justifyContent,
            bodyMinHeight: body.style.minHeight,
            bodyBackground: body.style.background,
            rootWidth: root ? root.style.width : '',
            rootMinHeight: root ? root.style.minHeight : ''
        };
        body.style.display = 'block';
        body.style.alignItems = 'stretch';
        body.style.justifyContent = 'flex-start';
        body.style.minHeight = '100vh';
        body.style.background = '#f8f9ff';
        if (root) {
            root.style.width = '100%';
            root.style.minHeight = '100vh';
        }
        return () => {
            body.style.display = prev.bodyDisplay;
            body.style.alignItems = prev.bodyAlignItems;
            body.style.justifyContent = prev.bodyJustifyContent;
            body.style.minHeight = prev.bodyMinHeight;
            body.style.background = prev.bodyBackground;
            if (root) {
                root.style.width = prev.rootWidth;
                root.style.minHeight = prev.rootMinHeight;
            }
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const client = await fetchCurrentClient();
            if (!mounted) return;
            if (client) {
                navigate('/auth/dashboard', { replace: true });
            } else {
                setError('Could not complete Google sign-in. Please try again.');
                setTimeout(() => navigate('/auth/login', { replace: true }), 1500);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [navigate]);

    return (
        <div className="font-body antialiased min-h-screen w-full flex items-center justify-center bg-[#f8f9ff] text-[#0b1c30] p-6">
            <div className="w-full max-w-md text-center">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <span
                        className="material-symbols-outlined fill text-5xl"
                        style={{ color: ACCENT }}
                    >
                        shield
                    </span>
                    <span className="font-headline font-bold text-4xl tracking-tight text-[#0b1c30]">
                        AuthShield
                    </span>
                </div>
                <div
                    className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e5eeff] p-10"
                    style={{ borderBottomColor: ACCENT, borderBottomWidth: 2 }}
                >
                    {error ? (
                        <>
                            <h2 className="font-headline font-bold text-2xl mb-2">Sign-in failed</h2>
                            <p className="text-sm" style={{ color: '#5f5e5e' }}>
                                {error}
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="font-headline font-bold text-2xl mb-2">Signing you in…</h2>
                            <p className="text-sm" style={{ color: '#5f5e5e' }}>
                                Finishing up your Google sign-in.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthGoogleCallback;
