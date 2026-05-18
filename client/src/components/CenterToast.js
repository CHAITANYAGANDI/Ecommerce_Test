import React, { useEffect, useState } from 'react';
import { FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';

/**
 * Apple-style centered glass pill toast. Listens to a `center-toast` custom
 * event so utility functions outside the React tree can fire it. Replaces
 * react-toastify so we have one consistent look across the storefront and
 * the auth/admin pages.
 */
function CenterToast() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (e) => {
            const { id, message, kind } = e.detail || {};
            if (!message) return;
            setToasts((prev) => [...prev, { id, message, kind, leaving: false }]);

            const dismissAfter = kind === 'error' ? 2800 : 1800;
            setTimeout(() => {
                setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
            }, dismissAfter);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, dismissAfter + 280);
        };
        window.addEventListener('center-toast', handler);
        return () => window.removeEventListener('center-toast', handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div
            aria-live="polite"
            className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center flex-col gap-3 px-4"
        >
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`${t.leaving ? 'ct-leaving' : 'ct-entering'} inline-flex items-center gap-3 px-5 py-3 pr-6 rounded-full text-white font-medium text-sm bg-ink-900/80 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-2xl shadow-ink-900/20 max-w-[80vw]`}
                    style={{ minWidth: 240 }}
                >
                    <span
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-xs shadow-md ${
                            t.kind === 'error'
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
                                : t.kind === 'info'
                                ? 'bg-gradient-to-br from-sky-400 to-cyan-600 shadow-cyan-500/30'
                                : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
                        }`}
                    >
                        {t.kind === 'error' ? <FaTimes /> : t.kind === 'info' ? <FaInfoCircle /> : <FaCheck />}
                    </span>
                    <span className="leading-snug tracking-tight">{t.message}</span>
                </div>
            ))}
        </div>
    );
}

export default CenterToast;
