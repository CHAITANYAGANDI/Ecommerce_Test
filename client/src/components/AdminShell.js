import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaUserShield, FaUsers, FaKey, FaShieldAlt, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import BrandMark from './BrandMark';
import { handleSuccess, logoutAdmin } from '../utils';

const NAV = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    { to: '/admin/register', label: 'Add admin', icon: FaUserShield },
    { to: '/admin/users', label: 'User management', icon: FaUsers },
    { to: '/admin/auth', label: 'Auth management', icon: FaKey },
    { to: '/admin/auth/protected', label: 'Authorized APIs', icon: FaShieldAlt },
];

/**
 * Shared admin shell: frosted-glass sidebar with navigation + glass top bar.
 * Used by every admin page so they share a consistent operational feel —
 * closer to a Linear/Stripe back office than a marketing site.
 */
function AdminShell({ title, subtitle, actions, children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutAdmin();
        handleSuccess('Logged out successfully');
        setTimeout(() => navigate('/admin/login'), 800);
    };

    return (
        <div className="min-h-screen flex">
            {/* Sidebar — desktop */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col glass-strong border-r border-white/40">
                <div className="p-6">
                    <Link to="/admin/dashboard" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                            <BrandMark className="w-5 h-5 text-white" />
                        </div>
                        <div className="leading-tight">
                            <p className="font-display font-bold text-ink-900">Trendy Treasures</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-700 font-semibold">
                                Admin
                            </p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        const active = location.pathname === item.to;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${active
                                        ? 'bg-brand-gradient text-white shadow-md shadow-brand-500/30'
                                        : 'text-ink-700 hover:bg-white/80 hover:text-ink-900'}`}
                            >
                                <Icon className={active ? 'text-white' : 'text-ink-500'} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-white/40">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50/80 transition-colors"
                    >
                        <FaSignOutAlt /> Log out
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar drawer */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50"
                    onClick={() => setMobileOpen(false)}
                >
                    <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
                    <aside
                        className="absolute left-0 top-0 bottom-0 w-72 glass-strong border-r border-white/40 flex flex-col animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 flex items-center justify-between">
                            <Link to="/admin/dashboard" className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-md shadow-brand-500/30">
                                    <BrandMark className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-display font-bold text-ink-900">Admin</span>
                            </Link>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2 rounded-full hover:bg-ink-100"
                                aria-label="Close menu"
                            >
                                <FaTimes className="text-ink-700" />
                            </button>
                        </div>
                        <nav className="flex-1 px-3 space-y-1">
                            {NAV.map((item) => {
                                const Icon = item.icon;
                                const active = location.pathname === item.to;
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                                            ${active
                                                ? 'bg-brand-gradient text-white shadow-md shadow-brand-500/30'
                                                : 'text-ink-700 hover:bg-white/80'}`}
                                    >
                                        <Icon className={active ? 'text-white' : 'text-ink-500'} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="p-3 border-t border-white/40">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50/80 transition-colors"
                            >
                                <FaSignOutAlt /> Log out
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <div className="flex-1 min-w-0">
                {/* Top bar */}
                <header className="glass-strong border-b border-white/40 sticky top-0 z-40">
                    <div className="px-4 sm:px-8 py-4 flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-2 rounded-full hover:bg-ink-100"
                            aria-label="Open menu"
                        >
                            <FaBars className="text-ink-700" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-ink-900 truncate">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xs text-ink-500 truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {actions}
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-8 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AdminShell;
