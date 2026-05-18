import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    handleError,
    handleSuccess,
    logoutClient,
    authFetch,
    fetchCurrentClient,
    isStrongPassword,
    STRONG_PASSWORD_MESSAGE,
    isValidUsername,
    USERNAME_MESSAGE
} from '../utils';

const ACCENT = '#426fe7';
const BG = '#11131b';
const SURFACE = '#1d1f27';
const SURFACE_LOW = '#191b23';
const SURFACE_HIGH = '#282a32';
const SURFACE_LOWEST = '#0c0e15';
const BORDER = '#33343d';
const BORDER_DIM = '#434654';
const TEXT = '#e2e1ed';
const TEXT_MUTED = '#c3c6d6';
const TEXT_DIM = '#8d909f';
const ERROR = '#ef4444';

function AuthSettings() {
    const navigate = useNavigate();

    const [clientName, setClientName] = useState('');
    const [currentUsername, setCurrentUsername] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [accountOpen, setAccountOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('username');
    const [resultModal, setResultModal] = useState(null); // { title, message, severity, onConfirm }

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
        body.style.background = BG;
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
        fetchCurrentClient().then((c) => {
            if (c) {
                setClientName(c.name || c.username || '');
                setCurrentUsername(c.username || '');
            }
        });
    }, []);

    const handleLogout = async () => {
        await logoutClient();
        handleSuccess('Logged out successfully');
        setTimeout(() => navigate('/auth/login'), 600);
    };

    const handleSaveUsername = async (e) => {
        e.preventDefault();
        const trimmed = usernameInput.trim();
        if (!trimmed) {
            return setResultModal({
                title: 'Username required',
                message: 'Please enter a new username.',
                severity: 'error'
            });
        }
        if (trimmed === currentUsername) {
            return setResultModal({
                title: 'No change',
                message: 'The new username matches your current one.',
                severity: 'error'
            });
        }
        if (!isValidUsername(trimmed)) {
            return setResultModal({
                title: 'Invalid username',
                message: USERNAME_MESSAGE,
                severity: 'error'
            });
        }
        setSavingUsername(true);
        try {
            const response = await authFetch('/me/username', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmed })
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.success) {
                setCurrentUsername(result.client.username);
                setUsernameInput('');
                setResultModal({
                    title: 'Username updated',
                    message: `Your username is now ${result.client.username}.`,
                    severity: 'success'
                });
            } else {
                setResultModal({
                    title: 'Could not update username',
                    message: result.message || 'Please try again.',
                    severity: 'error'
                });
            }
        } catch (err) {
            setResultModal({
                title: 'Could not update username',
                message: err.message,
                severity: 'error'
            });
        } finally {
            setSavingUsername(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmNewPassword } = passwords;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return setResultModal({
                title: 'Missing fields',
                message: 'Please fill in all password fields.',
                severity: 'error'
            });
        }
        if (newPassword !== confirmNewPassword) {
            return setResultModal({
                title: 'Passwords do not match',
                message: 'New password and confirmation must match.',
                severity: 'error'
            });
        }
        if (!isStrongPassword(newPassword)) {
            return setResultModal({
                title: 'Password is too weak',
                message: STRONG_PASSWORD_MESSAGE,
                severity: 'error'
            });
        }
        setChangingPassword(true);
        try {
            const response = await authFetch('/me/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.success) {
                setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                setResultModal({
                    title: 'Password updated',
                    message: 'Your password has been changed successfully.',
                    severity: 'success'
                });
            } else {
                setResultModal({
                    title: 'Could not update password',
                    message: result.message || 'Please try again.',
                    severity: 'error'
                });
            }
        } catch (err) {
            setResultModal({
                title: 'Could not update password',
                message: err.message,
                severity: 'error'
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const confirmDeleteAccount = async () => {
        setDeleting(true);
        try {
            const response = await authFetch('/me/account', { method: 'DELETE' });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.success) {
                setShowDeleteModal(false);
                setDeleting(false);
                setResultModal({
                    title: 'Account deleted',
                    message:
                        'Your account and all associated credentials have been permanently removed. You will now be logged out.',
                    severity: 'success',
                    onConfirm: () => {
                        setResultModal(null);
                        navigate('/auth/login');
                    }
                });
            } else {
                setDeleting(false);
                setResultModal({
                    title: 'Could not delete account',
                    message: result.message || 'Please try again.',
                    severity: 'error'
                });
            }
        } catch (err) {
            setDeleting(false);
            setResultModal({
                title: 'Could not delete account',
                message: err.message,
                severity: 'error'
            });
        }
    };

    return (
        <div
            className="font-body antialiased min-h-screen w-full flex flex-col"
            style={{ background: BG, color: TEXT }}
        >
            <header
                className="w-full h-16"
                style={{ background: SURFACE_LOWEST, borderBottom: `1px solid ${BORDER}` }}
            >
                <div className="flex items-center justify-between px-4 md:px-12 w-full h-full">
                    <div
                        className="flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        onClick={() => navigate('/auth/dashboard')}
                    >
                        <span
                            className="material-symbols-outlined fill text-3xl"
                            style={{ color: ACCENT }}
                        >
                            shield
                        </span>
                        <span className="font-headline font-bold text-2xl" style={{ color: TEXT }}>
                            AuthShield
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/auth/settings')}
                            className="hidden md:flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none bg-transparent border-0 cursor-pointer"
                            style={{ color: TEXT_MUTED }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = SURFACE_HIGH;
                                e.currentTarget.style.color = ACCENT;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = TEXT_MUTED;
                            }}
                            aria-label="Settings"
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setAccountOpen((v) => !v)}
                                className="flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none bg-transparent border-0 cursor-pointer"
                                style={{ color: TEXT_MUTED }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = SURFACE_HIGH;
                                    e.currentTarget.style.color = ACCENT;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = TEXT_MUTED;
                                }}
                                aria-label="Account"
                            >
                                <span className="material-symbols-outlined">account_circle</span>
                            </button>
                            {accountOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50"
                                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                                >
                                    {clientName && (
                                        <div
                                            className="px-4 py-2 text-xs uppercase tracking-wider text-left"
                                            style={{
                                                color: TEXT_DIM,
                                                borderBottom: `1px solid ${BORDER}`
                                            }}
                                        >
                                            {clientName}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 text-left px-4 py-2 text-sm transition-colors bg-transparent border-0 cursor-pointer"
                                        style={{ color: TEXT }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                            e.currentTarget.style.color = ERROR;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = TEXT;
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-base">logout</span>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full px-4 md:px-12 py-8 md:py-12 flex flex-col md:flex-row gap-8 md:gap-12">
                <aside className="w-full md:w-64 flex-shrink-0">
                    <button
                        onClick={() => navigate('/auth/dashboard')}
                        className="relative inline-flex items-center mb-6 pl-0 ml-0 transition-colors uppercase tracking-widest text-xs font-medium bg-transparent border-0 cursor-pointer"
                        style={{ color: TEXT_MUTED }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                    >
                        <span
                            className="material-symbols-outlined text-lg absolute"
                            style={{ right: '100%', marginRight: '6px' }}
                        >
                            arrow_back
                        </span>
                        Back to dashboard
                    </button>
                    <h1
                        className="font-headline font-semibold text-2xl text-left mb-6"
                        style={{ color: TEXT }}
                    >
                        Settings
                    </h1>
                    <nav className="flex flex-col gap-1">
                        <SideNavItem
                            label="Change Username"
                            icon="person"
                            active={activeSection === 'username'}
                            onClick={() => setActiveSection('username')}
                        />
                        <SideNavItem
                            label="Change Password"
                            icon="lock"
                            active={activeSection === 'password'}
                            onClick={() => setActiveSection('password')}
                        />
                        <SideNavItem
                            label="Delete Account"
                            icon="delete"
                            active={activeSection === 'delete'}
                            onClick={() => setActiveSection('delete')}
                            danger
                        />
                    </nav>
                </aside>

                <div className="flex-1 flex flex-col gap-12 w-full max-w-3xl">
                    {activeSection === 'username' && (<>
                    <section
                        className="rounded-xl overflow-hidden flex flex-col"
                        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    >
                        <div
                            className="px-8 py-6"
                            style={{ borderBottom: `1px solid ${BORDER}` }}
                        >
                            <h3 className="font-headline font-semibold text-xl text-left" style={{ color: TEXT }}>
                                Change username
                            </h3>
                        </div>
                        <form onSubmit={handleSaveUsername}>
                            <div className="p-8 flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label
                                        className="text-xs uppercase tracking-wider font-medium text-left"
                                        style={{ color: TEXT_MUTED }}
                                    >
                                        Current Username
                                    </label>
                                    <div
                                        className="w-full h-10 px-3 rounded text-sm font-body flex items-center"
                                        style={{
                                            background: SURFACE_LOW,
                                            color: TEXT_MUTED,
                                            border: `1px solid ${BORDER}`
                                        }}
                                    >
                                        {currentUsername || '—'}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label
                                        className="text-xs uppercase tracking-wider font-medium text-left"
                                        style={{ color: TEXT_MUTED }}
                                    >
                                        New Username
                                    </label>
                                    <input
                                        type="text"
                                        value={usernameInput}
                                        onChange={(e) => setUsernameInput(e.target.value)}
                                        className="w-full h-10 px-3 rounded text-sm font-body outline-none transition-all"
                                        style={{
                                            background: BG,
                                            color: TEXT,
                                            border: `1px solid ${BORDER}`
                                        }}
                                        onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                                        onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
                                    />
                                </div>
                            </div>
                            <div
                                className="px-8 py-5 flex justify-end"
                                style={{
                                    background: SURFACE_LOW,
                                    borderTop: `1px solid ${BORDER}`
                                }}
                            >
                                <button
                                    type="submit"
                                    disabled={savingUsername}
                                    className="text-sm font-semibold px-6 py-2 rounded transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ background: ACCENT, color: '#ffffff', border: 'none' }}
                                    onMouseEnter={(e) => {
                                        if (!savingUsername) e.currentTarget.style.opacity = '0.9';
                                    }}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                                >
                                    {savingUsername ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </section>
                    </>)}

                    {activeSection === 'password' && (<>
                    <section
                        className="rounded-xl overflow-hidden flex flex-col"
                        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    >
                        <div
                            className="px-8 py-6"
                            style={{ borderBottom: `1px solid ${BORDER}` }}
                        >
                            <h3 className="font-headline font-semibold text-xl text-left" style={{ color: TEXT }}>
                                Change Password
                            </h3>
                        </div>
                        <form onSubmit={handleChangePassword}>
                            <div className="p-8 flex flex-col gap-6 max-w-xl">
                                <PasswordField
                                    label="Current Password"
                                    value={passwords.currentPassword}
                                    onChange={(v) =>
                                        setPasswords((p) => ({ ...p, currentPassword: v }))
                                    }
                                />
                                <PasswordField
                                    label="New Password"
                                    value={passwords.newPassword}
                                    onChange={(v) =>
                                        setPasswords((p) => ({ ...p, newPassword: v }))
                                    }
                                />
                                <PasswordField
                                    label="Confirm New Password"
                                    value={passwords.confirmNewPassword}
                                    onChange={(v) =>
                                        setPasswords((p) => ({ ...p, confirmNewPassword: v }))
                                    }
                                />
                            </div>
                            <div
                                className="px-8 py-5 flex justify-end"
                                style={{
                                    background: SURFACE_LOW,
                                    borderTop: `1px solid ${BORDER}`
                                }}
                            >
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="text-sm font-medium px-6 py-2 rounded transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{
                                        background: SURFACE_HIGH,
                                        color: TEXT,
                                        border: `1px solid ${BORDER_DIM}`
                                    }}
                                    onMouseEnter={(e) => {
                                        if (changingPassword) return;
                                        e.currentTarget.style.color = ACCENT;
                                        e.currentTarget.style.borderColor = ACCENT;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = TEXT;
                                        e.currentTarget.style.borderColor = BORDER_DIM;
                                    }}
                                >
                                    {changingPassword ? 'Updating…' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </section>
                    </>)}

                    {activeSection === 'delete' && (<>
                    <section
                        className="rounded-xl overflow-hidden flex flex-col"
                        style={{
                            background: SURFACE,
                            border: `1px solid rgba(239, 68, 68, 0.25)`
                        }}
                    >
                        <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex flex-col gap-1 max-w-lg text-left">
                                <h4 className="text-sm font-semibold" style={{ color: TEXT }}>
                                    Delete Account
                                </h4>
                                <p className="text-xs" style={{ color: TEXT_DIM }}>
                                    Once you delete your account, there is no going back. All of your data,
                                    resources, and configurations will be permanently wiped.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="text-sm font-medium px-6 py-2 rounded transition-all flex-shrink-0 cursor-pointer"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: ERROR,
                                    border: `1px solid ${ERROR}`
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = ERROR;
                                    e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                    e.currentTarget.style.color = ERROR;
                                }}
                            >
                                Delete Account
                            </button>
                        </div>
                    </section>
                    </>)}
                </div>
            </main>

            {showDeleteModal && (
                <DeleteAccountModal
                    onClose={() => !deleting && setShowDeleteModal(false)}
                    onConfirm={confirmDeleteAccount}
                    deleting={deleting}
                />
            )}

            {resultModal && (
                <ResultModal
                    title={resultModal.title}
                    message={resultModal.message}
                    severity={resultModal.severity}
                    onConfirm={
                        resultModal.onConfirm || (() => setResultModal(null))
                    }
                />
            )}
        </div>
    );
}

function ResultModal({ title, message, severity, onConfirm }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onConfirm();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onConfirm]);

    const isSuccess = severity === 'success';
    const accent = isSuccess ? '#10b981' : ERROR;
    const accentBg = isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    const icon = isSuccess ? 'check_circle' : 'error';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'rgba(11, 13, 27, 0.55)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onConfirm();
            }}
        >
            <div
                className="relative w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(29, 31, 39, 0.78)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                        '0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
                }}
            >
                <div className="p-8 sm:p-10">
                    <div
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
                        style={{ background: accentBg, color: accent }}
                    >
                        <span className="material-symbols-outlined text-3xl">{icon}</span>
                    </div>
                    <h2 className="font-headline font-bold text-2xl mb-3 text-left" style={{ color: TEXT }}>
                        {title}
                    </h2>
                    {message && (
                        <p className="text-sm mb-8 text-left" style={{ color: TEXT_MUTED }}>
                            {message}
                        </p>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="text-sm font-semibold px-6 py-2.5 rounded transition-all cursor-pointer"
                            style={{ background: ACCENT, color: '#ffffff', border: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PasswordField({ label, value, onChange }) {
    const [show, setShow] = useState(false);
    return (
        <div className="flex flex-col gap-2">
            <label
                className="text-xs uppercase tracking-wider font-medium text-left"
                style={{ color: TEXT_MUTED }}
            >
                {label}
            </label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 px-3 pr-10 rounded text-sm font-body outline-none transition-all"
                    style={{
                        background: BG,
                        color: TEXT,
                        border: `1px solid ${BORDER}`
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
                />
                <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center bg-transparent border-0 cursor-pointer"
                    style={{ color: TEXT_DIM }}
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    <span className="material-symbols-outlined text-base">
                        {show ? 'visibility' : 'visibility_off'}
                    </span>
                </button>
            </div>
        </div>
    );
}

function DeleteAccountModal({ onClose, onConfirm, deleting }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && !deleting) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, deleting]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'rgba(11, 13, 27, 0.55)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !deleting) onClose();
            }}
        >
            <div
                className="relative w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(29, 31, 39, 0.78)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow:
                        '0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
                }}
            >
                <button
                    onClick={onClose}
                    disabled={deleting}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 rounded-full transition-colors focus:outline-none z-10 bg-transparent border-0 cursor-pointer disabled:opacity-50"
                    style={{ color: TEXT_MUTED }}
                    onMouseEnter={(e) => {
                        if (deleting) return;
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = TEXT;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = TEXT_MUTED;
                    }}
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="p-8 sm:p-10">
                    <h2 className="font-headline font-bold text-2xl mb-3 text-left" style={{ color: TEXT }}>
                        Delete account
                    </h2>
                    <p className="text-sm mb-4 text-left" style={{ color: TEXT_MUTED }}>
                        This will permanently delete your account, every credential you've created, and any
                        associated access. This action cannot be undone.
                    </p>
                    <p className="text-sm mb-8 text-left" style={{ color: TEXT }}>
                        Do you want to delete your account?
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={deleting}
                            className="text-sm font-medium px-5 py-2.5 rounded transition-colors bg-transparent cursor-pointer disabled:opacity-50"
                            style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
                            onMouseEnter={(e) => {
                                if (deleting) return;
                                e.currentTarget.style.color = TEXT;
                                e.currentTarget.style.borderColor = TEXT_DIM;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = TEXT_MUTED;
                                e.currentTarget.style.borderColor = BORDER;
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={deleting}
                            className="text-sm font-semibold px-5 py-2.5 rounded transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: ERROR, color: '#ffffff', border: 'none' }}
                            onMouseEnter={(e) => {
                                if (!deleting) e.currentTarget.style.opacity = '0.9';
                            }}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            {deleting ? 'Deleting…' : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SideNavItem({ label, icon, active, onClick, danger }) {
    const baseColor = active ? (danger ? ERROR : ACCENT) : TEXT_MUTED;
    const bg = active
        ? danger
            ? 'rgba(239, 68, 68, 0.12)'
            : 'rgba(66, 111, 231, 0.12)'
        : 'transparent';
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-left bg-transparent border-0 cursor-pointer text-sm font-medium"
            style={{ color: baseColor, background: bg }}
            onMouseEnter={(e) => {
                if (active) return;
                e.currentTarget.style.background = danger
                    ? 'rgba(239, 68, 68, 0.08)'
                    : SURFACE_HIGH;
                e.currentTarget.style.color = danger ? ERROR : TEXT;
            }}
            onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = TEXT_MUTED;
            }}
        >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
        </button>
    );
}

export default AuthSettings;
