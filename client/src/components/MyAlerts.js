import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaTrashAlt, FaExternalLinkAlt, FaArrowLeft } from 'react-icons/fa';
import {
    deletePriceAlert,
    fetchCurrentUser,
    handleError,
    handleSuccess,
    listPriceAlerts,
    showConfirm
} from '../utils';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const fmtPrice = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function MyAlerts() {
    const [currentUser, setCurrentUser] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentUser().then((u) => {
            // apiFetch already bounces unauthenticated users to /login, so
            // if we land here without a user it's a transient state.
            setCurrentUser(u);
        });
        refresh();
    }, []);

    const refresh = async () => {
        setLoading(true);
        try {
            const res = await listPriceAlerts();
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
            } else {
                handleError('Failed to load your alerts.');
                setAlerts([]);
            }
        } catch (err) {
            handleError(err.message || 'Failed to load your alerts.');
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (alert) => {
        const ok = await showConfirm({
            title: 'Stop tracking this product?',
            body: `You won't receive any more price alerts for "${alert.product_name}".`,
            confirmLabel: 'Stop tracking',
            cancelLabel: 'Keep tracking',
            danger: true
        });
        if (!ok) return;

        try {
            const res = await deletePriceAlert(alert._id);
            if (res.ok) {
                handleSuccess('Alert removed.');
                setAlerts((prev) => prev.filter((a) => a._id !== alert._id));
            } else {
                const data = await res.json().catch(() => ({}));
                handleError(data.message || 'Failed to delete alert.');
            }
        } catch (err) {
            handleError(err.message || 'Failed to delete alert.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <SiteHeader currentUser={currentUser} setCurrentUser={setCurrentUser} showSearch={false} />

            <main className="store-shell py-6 lg:py-8 flex-1">
                <button onClick={() => navigate(-1)} className="btn-ghost mb-6">
                    <FaArrowLeft className="text-xs" /> Back
                </button>

                <div className="max-w-3xl mx-auto">
                    <header className="mb-6 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-md shadow-brand-500/40">
                            <FaBell className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-ink-900">Price alerts</h1>
                            <p className="text-sm text-ink-500">
                                We'll email you when any of these products drop below your threshold.
                            </p>
                        </div>
                    </header>

                    {loading ? (
                        <div className="card p-10 text-center text-ink-500 animate-pulse">Loading alerts…</div>
                    ) : alerts && alerts.length === 0 ? (
                        <div className="card p-10 text-center">
                            <p className="text-ink-700 font-medium">No price alerts yet.</p>
                            <p className="text-sm text-ink-500 mt-1">
                                Open any product, scroll to the chart, and tap <em>Track price</em>.
                            </p>
                            <Link to="/home" className="btn-primary mt-5 inline-flex">Browse products</Link>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {(alerts || []).map((alert) => {
                                const providerLabel = alert.provider.charAt(0).toUpperCase() + alert.provider.slice(1);
                                const lastNotified = alert.last_notified_at
                                    ? `last notified ${fmtDate(alert.last_notified_at)}`
                                    : 'never notified';
                                return (
                                    <li
                                        key={alert._id}
                                        className="card flex items-center gap-4 p-4"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={
                                                        alert.provider === 'amazon'
                                                            ? 'source-pill-amazon'
                                                            : 'source-pill-walmart'
                                                    }
                                                >
                                                    {providerLabel}
                                                </span>
                                                <span className="text-[11px] text-ink-500">
                                                    created {fmtDate(alert.created_at)} · {lastNotified}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-ink-900 truncate">
                                                {alert.product_name}
                                            </p>
                                            <p className="text-xs text-ink-600 mt-1">
                                                Notify when price ≤{' '}
                                                <span className="font-bold text-ink-900">{fmtPrice(alert.threshold_price)}</span>
                                                {' · '}
                                                <span className="text-ink-500">
                                                    last known {fmtPrice(alert.last_known_price)}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                to={`/product/${alert.provider}/${alert.product_id}`}
                                                className="btn-secondary !py-2 !px-3 text-xs"
                                                title="View product"
                                            >
                                                <FaExternalLinkAlt /> View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(alert)}
                                                className="p-2.5 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                                                aria-label="Stop tracking"
                                                title="Stop tracking"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}

export default MyAlerts;
