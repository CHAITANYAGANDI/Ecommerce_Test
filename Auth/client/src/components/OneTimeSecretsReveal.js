import React, { useEffect, useState } from 'react';
import { handleError, handleSuccess } from '../utils';

const ACCENT = '#426fe7';
const SURFACE_HIGH = '#282a32';
const BORDER = '#33343d';
const TEXT = '#e2e1ed';
const TEXT_MUTED = '#c3c6d6';
const WARN = '#f59e0b';

function OneTimeSecretsReveal({
    title = 'Save your credentials',
    intro = "This is the only time you'll see your client secret. Copy it now and store it somewhere safe. If you lose it, you'll need to rotate it.",
    clientId,
    clientSecret,
    onClose
}) {
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && confirmed) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, confirmed]);

    const copyToClipboard = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            handleSuccess(`${label} copied`);
        } catch {
            handleError(`Could not copy ${label}`);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            style={{
                background: 'rgba(11, 13, 27, 0.6)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)'
            }}
        >
            <div
                className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(29, 31, 39, 0.85)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                        '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                }}
            >
                <div className="p-8 sm:p-10">
                    <div className="flex items-start gap-3 mb-4">
                        <span
                            className="material-symbols-outlined mt-1 flex-shrink-0"
                            style={{ color: WARN }}
                        >
                            warning
                        </span>
                        <div>
                            <h2
                                className="font-headline font-bold text-2xl mb-2 text-left"
                                style={{ color: TEXT }}
                            >
                                {title}
                            </h2>
                            <p className="text-sm text-left" style={{ color: TEXT_MUTED }}>
                                {intro}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 mt-6">
                        {clientId && (
                            <SecretRow
                                label="Client ID"
                                value={clientId}
                                onCopy={() => copyToClipboard(clientId, 'Client ID')}
                            />
                        )}
                        {clientSecret && (
                            <SecretRow
                                label="Client Secret"
                                value={clientSecret}
                                onCopy={() => copyToClipboard(clientSecret, 'Client Secret')}
                                highlight
                            />
                        )}
                    </div>

                    <div
                        className="mt-6 rounded p-3 text-xs flex items-start gap-2"
                        style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: WARN,
                            border: '1px solid rgba(245, 158, 11, 0.25)'
                        }}
                    >
                        <span className="material-symbols-outlined text-base">info</span>
                        <span>
                            We don't store the secret in plaintext, so we can't show it again.
                            If you misplace it, rotate the secret to generate a new one.
                        </span>
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                        <label
                            className="flex items-center gap-2 cursor-pointer text-sm"
                            style={{ color: TEXT_MUTED }}
                        >
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                style={{ accentColor: ACCENT }}
                            />
                            I've copied my client secret somewhere safe
                        </label>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={!confirmed}
                            className="text-sm font-semibold px-5 py-2.5 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: ACCENT, color: '#ffffff', border: 'none' }}
                            onMouseEnter={(e) => {
                                if (confirmed) e.currentTarget.style.opacity = '0.9';
                            }}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SecretRow({ label, value, onCopy, highlight }) {
    return (
        <div>
            <div
                className="text-xs uppercase tracking-wider font-medium mb-1.5"
                style={{ color: TEXT_MUTED }}
            >
                {label}
            </div>
            <div
                className="flex items-center gap-2 p-3 rounded font-mono text-xs break-all"
                style={{
                    background: highlight ? 'rgba(66,111,231,0.08)' : 'rgba(11,13,27,0.6)',
                    color: TEXT,
                    border: `1px solid ${highlight ? ACCENT : BORDER}`
                }}
            >
                <span className="flex-1">{value}</span>
                <button
                    onClick={onCopy}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
                    style={{
                        background: SURFACE_HIGH,
                        color: TEXT_MUTED,
                        border: `1px solid ${BORDER}`
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = ACCENT;
                        e.currentTarget.style.borderColor = ACCENT;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = TEXT_MUTED;
                        e.currentTarget.style.borderColor = BORDER;
                    }}
                    aria-label={`Copy ${label}`}
                >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    Copy
                </button>
            </div>
        </div>
    );
}

export default OneTimeSecretsReveal;
