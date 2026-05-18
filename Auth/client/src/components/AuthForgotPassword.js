import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    handleError,
    handleSuccess,
    AUTH_API_BASE,
    isStrongPassword,
    STRONG_PASSWORD_MESSAGE
} from '../utils';

const ACCENT = '#426fe7';

function AuthForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState('request'); // 'request' | 'verify'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState(null); // { severity, message }

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

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            return handleError('Email is required');
        }
        setSubmitting(true);
        setBanner(null);
        try {
            const res = await fetch(`${AUTH_API_BASE}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.trim() })
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok && result.success) {
                setBanner({
                    severity: 'success',
                    message:
                        'If an account exists for that email, a 6-digit reset code has been sent. Check your inbox (and spam) and enter it below.'
                });
                setStep('verify');
                handleSuccess('Reset code sent');
            } else {
                setBanner({
                    severity: 'error',
                    message: result.message || 'Could not start password reset.'
                });
            }
        } catch (err) {
            setBanner({ severity: 'error', message: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp.trim() || !newPassword || !confirmNewPassword) {
            return handleError('All fields are required');
        }
        if (newPassword !== confirmNewPassword) {
            return setBanner({ severity: 'error', message: 'Passwords do not match.' });
        }
        if (!isStrongPassword(newPassword)) {
            return setBanner({
                severity: 'error',
                message: STRONG_PASSWORD_MESSAGE
            });
        }
        setSubmitting(true);
        setBanner(null);
        try {
            const res = await fetch(`${AUTH_API_BASE}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: email.trim(),
                    otp: Number(otp.trim()),
                    newPassword
                })
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok && result.success) {
                setBanner({
                    severity: 'success',
                    message: 'Password reset. Redirecting to sign in…'
                });
                handleSuccess('Password reset');
                setTimeout(() => navigate('/auth/login'), 900);
            } else {
                setBanner({
                    severity: 'error',
                    message: result.message || 'Could not reset password.'
                });
            }
        } catch (err) {
            setBanner({ severity: 'error', message: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="font-body antialiased min-h-screen w-full flex items-center justify-center bg-[#f8f9ff] text-[#0b1c30] p-6">
            <div className="w-full max-w-md">
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
                    className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e5eeff] border-b-2 p-8 sm:p-10"
                    style={{ borderBottomColor: ACCENT }}
                >
                    <div className="text-center mb-8">
                        <h2 className="font-headline font-bold text-3xl text-[#0b1c30] mb-2 text-center">
                            {step === 'request' ? 'Forgot password' : 'Reset password'}
                        </h2>
                        <p className="font-body text-sm text-[#5f5e5e] text-center">
                            {step === 'request'
                                ? "Enter the email tied to your AuthShield account and we'll send you a 6-digit reset code."
                                : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
                        </p>
                    </div>

                    {banner && (
                        <div
                            className="text-sm rounded p-3 mb-5"
                            style={{
                                background:
                                    banner.severity === 'success'
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : 'rgba(239, 68, 68, 0.12)',
                                color: banner.severity === 'success' ? '#047857' : '#b91c1c'
                            }}
                        >
                            {banner.message}
                        </div>
                    )}

                    {step === 'request' ? (
                        <form onSubmit={handleRequestOtp} className="space-y-5">
                            <div>
                                <label
                                    className="block w-full pl-0 ml-0 text-left font-headline font-medium text-sm text-[#0b1c30] mb-1.5"
                                    htmlFor="email"
                                >
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-[#5f5e5e] text-lg">
                                            mail
                                        </span>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="block w-full pl-10 pr-3 py-2.5 border border-[#dce9ff] rounded bg-[#f8f9ff] text-[#0b1c30] sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#426fe7] focus:border-[#426fe7] transition-shadow"
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded shadow-sm text-base font-headline font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: ACCENT, color: '#ffffff' }}
                                >
                                    {submitting ? 'Sending…' : 'Send reset code'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label
                                    className="block w-full pl-0 ml-0 text-left font-headline font-medium text-sm text-[#0b1c30] mb-1.5"
                                    htmlFor="otp"
                                >
                                    Reset code
                                </label>
                                <input
                                    id="otp"
                                    inputMode="numeric"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(e.target.value.replace(/\D/g, ''))
                                    }
                                    required
                                    className="block w-full px-3 py-2.5 text-center tracking-[0.4em] font-mono text-lg border border-[#dce9ff] rounded bg-[#f8f9ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#426fe7] focus:border-[#426fe7] transition-shadow"
                                />
                            </div>
                            <div>
                                <label
                                    className="block w-full pl-0 ml-0 text-left font-headline font-medium text-sm text-[#0b1c30] mb-1.5"
                                    htmlFor="newPassword"
                                >
                                    New password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-[#5f5e5e] text-lg">
                                            lock
                                        </span>
                                    </div>
                                    <input
                                        id="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-10 py-2.5 border border-[#dce9ff] rounded bg-[#f8f9ff] text-[#0b1c30] sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#426fe7] focus:border-[#426fe7] transition-shadow"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer bg-transparent border-0"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <span className="material-symbols-outlined text-[#5f5e5e] text-lg">
                                            {showPassword ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label
                                    className="block w-full pl-0 ml-0 text-left font-headline font-medium text-sm text-[#0b1c30] mb-1.5"
                                    htmlFor="confirmNewPassword"
                                >
                                    Confirm new password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-[#5f5e5e] text-lg">
                                            lock
                                        </span>
                                    </div>
                                    <input
                                        id="confirmNewPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 border border-[#dce9ff] rounded bg-[#f8f9ff] text-[#0b1c30] sm:text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#426fe7] focus:border-[#426fe7] transition-shadow"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded shadow-sm text-base font-headline font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: ACCENT, color: '#ffffff' }}
                                >
                                    {submitting ? 'Resetting…' : 'Reset password'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('request');
                                        setOtp('');
                                        setBanner(null);
                                    }}
                                    className="text-xs font-medium underline bg-transparent border-0 cursor-pointer"
                                    style={{ color: '#5f5e5e' }}
                                >
                                    Use a different email
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-[#dce9ff] text-center">
                        <p className="font-body text-sm">
                            <Link
                                to="/auth/login"
                                className="font-headline font-medium transition-colors hover:underline"
                                style={{ color: ACCENT }}
                            >
                                ← Back to sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthForgotPassword;
