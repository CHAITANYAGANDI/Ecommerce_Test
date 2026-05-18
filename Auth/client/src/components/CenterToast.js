import React, { useEffect, useState } from 'react';

/**
 * Apple-style glass pill that appears in the centre of the screen for any
 * handleSuccess/handleError call. Listens to a custom 'center-toast' event so
 * utility functions outside the React tree can fire it. Replaces the default
 * react-toastify look (which slides from the right edge and feels too tied
 * to "notification" framing for what is really a tiny copy/save confirmation).
 */
function CenterToast() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (e) => {
            const { id, message, kind } = e.detail || {};
            if (!message) return;
            setToasts((prev) => [...prev, { id, message, kind }]);
            // auto-dismiss
            setTimeout(() => {
                setToasts((prev) =>
                    prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
                );
            }, kind === 'error' ? 2600 : 1600);
            // remove from DOM after the fade-out finishes
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, kind === 'error' ? 2900 : 1900);
        };
        window.addEventListener('center-toast', handler);
        return () => window.removeEventListener('center-toast', handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 9999,
                gap: 12,
                flexDirection: 'column'
            }}
        >
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={t.leaving ? 'ct-pill ct-pill-leaving' : 'ct-pill'}
                    style={pillStyle(t.kind)}
                >
                    <span style={iconRingStyle(t.kind)}>
                        {t.kind === 'error' ? <CrossIcon /> : <CheckIcon />}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>
                        {t.message}
                    </span>
                </div>
            ))}
        </div>
    );
}

const pillStyle = (kind) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 22px 12px 14px',
    borderRadius: 9999,
    background: 'rgba(17, 17, 19, 0.78)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow:
        '0 18px 48px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
    color: '#fff',
    minWidth: 240,
    maxWidth: '70vw'
});

const iconRingStyle = (kind) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background:
        kind === 'error'
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #34d399, #10b981)',
    color: '#fff',
    flexShrink: 0,
    boxShadow:
        kind === 'error'
            ? '0 0 0 4px rgba(239, 68, 68, 0.15)'
            : '0 0 0 4px rgba(52, 211, 153, 0.15)'
});

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CrossIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default CenterToast;
