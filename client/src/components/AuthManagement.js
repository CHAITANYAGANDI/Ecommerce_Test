import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaKey, FaShieldAlt, FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import AdminShell from './AdminShell';

function AuthManagement() {
    const navigate = useNavigate();

    return (
        <AdminShell
            title="Auth management"
            subtitle="Manage authorization grants and inspect connected provider APIs."
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <button
                    onClick={() => navigate('/admin/auth/request')}
                    className="card-interactive p-6 text-left group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg">
                        <FaKey />
                    </div>
                    <h3 className="mt-5 font-bold text-ink-900 flex items-center justify-between">
                        Request API authorization
                        <FaArrowRight className="text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all text-sm" />
                    </h3>
                    <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                        Start an OAuth-style flow against an external provider's auth server
                        and store the resulting access token.
                    </p>
                </button>

                <button
                    onClick={() => navigate('/admin/auth/protected')}
                    className="card-interactive p-6 text-left group"
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
                        <FaShieldAlt />
                    </div>
                    <h3 className="mt-5 font-bold text-ink-900 flex items-center justify-between">
                        Authorized APIs
                        <FaArrowRight className="text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all text-sm" />
                    </h3>
                    <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                        Inspect which APIs we currently hold valid tokens for and confirm
                        the gateway can reach them.
                    </p>
                </button>

                <div className="glass rounded-3xl p-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                        <FaInfoCircle />
                    </div>
                    <h3 className="mt-5 font-bold text-ink-900">How it works</h3>
                    <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                        The API Gateway injects a stored <code className="px-1.5 py-0.5 rounded bg-white/70 text-xs">productsauthorization</code>{' '}
                        header on every Amazon / Walmart product request. Tokens are
                        cached in-memory for 60s.
                    </p>
                </div>
            </div>
        </AdminShell>
    );
}

export default AuthManagement;
