import React, { useEffect, useState } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { createPriceAlert, handleError, handleSuccess } from '../utils';

// Modal where a logged-in buyer sets a threshold price for a product.
// Pre-fills threshold to currentPrice (rounded down to the nearest dollar)
// so the buyer just has to confirm or tweak.
function TrackPriceModal({ open, onClose, provider, productId, productName, currentPrice }) {
    const initialThreshold = currentPrice
        ? Math.max(1, Math.floor(currentPrice * 0.95))
        : '';
    const [threshold, setThreshold] = useState(initialThreshold);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setThreshold(initialThreshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, currentPrice]);

    // Close on Escape — small detail, matches the existing ConfirmModal UX.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const num = Number(threshold);
    const isValid = Number.isFinite(num) && num > 0 && num <= 1_000_000;

    const submit = async (e) => {
        e.preventDefault();
        if (!isValid || submitting) return;
        setSubmitting(true);
        try {
            const res = await createPriceAlert({
                provider,
                product_id: productId,
                product_name: productName,
                threshold_price: num,
                last_known_price: Number(currentPrice) || num
            });
            if (res.ok) {
                handleSuccess(`Tracking ${productName}. We'll email you when it drops to $${num.toFixed(2)} or below.`);
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                handleError(data.message || 'Failed to create alert.');
            }
        } catch (err) {
            handleError(err.message || 'Failed to create alert.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-md glass-strong rounded-2xl p-6 animate-pop"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-gradient text-white flex items-center justify-center shadow-md shadow-brand-500/40">
                            <FaBell />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-ink-900 leading-tight">Track this price</h3>
                            <p className="text-xs text-ink-500 mt-0.5">We'll email you when it drops.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-ink-100 text-ink-500"
                        aria-label="Close"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="rounded-xl bg-white/70 border border-ink-100 px-4 py-3 mb-4">
                    <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold">Currently</p>
                    <p className="text-2xl font-bold text-ink-900 leading-none mt-1">
                        ${Number(currentPrice || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-ink-600 mt-1 truncate">{productName}</p>
                </div>

                <label className="block">
                    <span className="text-sm font-medium text-ink-700">Notify me when price drops to</span>
                    <div className="mt-2 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 font-semibold">$</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-full bg-white border border-ink-200/80 text-base font-semibold text-ink-900 focus:outline-none focus:border-brand-400 focus:shadow-focus"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                </label>

                {!isValid && threshold !== '' && (
                    <p className="mt-2 text-xs text-red-600">Enter a positive amount.</p>
                )}

                <p className="mt-3 text-xs text-ink-500">
                    You'll get at most one email per drop — no re-notifications within 24 hours.
                </p>

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary !py-2.5 flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid || submitting}
                        className="btn-primary !py-2.5 flex-1"
                    >
                        {submitting ? 'Saving…' : 'Track price'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default TrackPriceModal;
