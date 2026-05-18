import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaUsers, FaKey, FaShieldAlt, FaArrowRight, FaChartLine, FaCheckCircle } from 'react-icons/fa';
import AdminShell from './AdminShell';

const TILES = [
    {
        to: '/admin/register',
        icon: FaUserShield,
        title: 'Add admin',
        body: 'Create a new operator account for the back office team.',
        color: 'from-violet-500 to-indigo-500',
    },
    {
        to: '/admin/users',
        icon: FaUsers,
        title: 'User management',
        body: 'View shoppers, deactivate accounts, and audit administrator access.',
        color: 'from-sky-500 to-cyan-500',
    },
    {
        to: '/admin/auth',
        icon: FaKey,
        title: 'Auth management',
        body: 'Request a new authorization grant from an upstream provider API.',
        color: 'from-emerald-500 to-teal-500',
    },
    {
        to: '/admin/auth/protected',
        icon: FaShieldAlt,
        title: 'Authorized APIs',
        body: 'See which provider APIs are connected and inspect active tokens.',
        color: 'from-rose-500 to-pink-500',
    },
];

function AdminDashboard() {
    const navigate = useNavigate();

    return (
        <AdminShell
            title="Dashboard"
            subtitle="Welcome back — here's the operations overview."
        >
            {/* Stat strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="card p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FaCheckCircle />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">System</p>
                        <p className="text-lg font-bold text-ink-900">All services healthy</p>
                    </div>
                </div>
                <div className="card p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                        <FaShieldAlt />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Auth</p>
                        <p className="text-lg font-bold text-ink-900">Tokens active</p>
                    </div>
                </div>
                <div className="card p-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <FaChartLine />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Connected sellers</p>
                        <p className="text-lg font-bold text-ink-900">Amazon · Walmart</p>
                    </div>
                </div>
            </div>

            {/* Action grid */}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500 mb-3">
                What would you like to do?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {TILES.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <button
                            key={tile.to}
                            onClick={() => navigate(tile.to)}
                            className="card-interactive text-left p-6 flex items-start gap-4 group"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tile.color} text-white flex items-center justify-center shadow-lg shrink-0`}>
                                <Icon className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-ink-900">{tile.title}</h3>
                                    <FaArrowRight className="text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all text-sm" />
                                </div>
                                <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
                                    {tile.body}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </AdminShell>
    );
}

export default AdminDashboard;
