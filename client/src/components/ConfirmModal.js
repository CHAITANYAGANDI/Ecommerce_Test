import React, { useEffect, useState, useCallback } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

/**
 * Custom replacement for the browser's native window.confirm. Listens to a
 * `center-confirm` custom event so any utility (showConfirm in utils.js) can
 * fire it without a React hook. The event carries a one-shot resolver that
 * returns the user's choice.
 *
 * Usage from outside React:
 *   const ok = await showConfirm({
 *     title: 'Delete this admin?',
 *     body: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true
 *   });
 *   if (ok) { ...do the thing... }
 */
function ConfirmModal() {
    const [dialog, setDialog] = useState(null);

    const close = useCallback(
        (result) => {
            if (!dialog) return;
            dialog.resolve(result);
            setDialog(null);
        },
        [dialog]
    );

    useEffect(() => {
        const handler = (e) => {
            const { title, body, confirmLabel, cancelLabel, danger, resolve } = e.detail || {};
            if (typeof resolve !== 'function') return;
            setDialog({
                title: title || 'Are you sure?',
                body: body || '',
                confirmLabel: confirmLabel || 'Confirm',
                cancelLabel: cancelLabel || 'Cancel',
                danger: !!danger,
                resolve
            });
        };
        window.addEventListener('center-confirm', handler);
        return () => window.removeEventListener('center-confirm', handler);
    }, []);

    useEffect(() => {
        if (!dialog) return;
        const onKey = (e) => {
            if (e.key === 'Escape') close(false);
            if (e.key === 'Enter') close(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialog, close]);

    if (!dialog) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            <div
                className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
                onClick={() => close(false)}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-md glass-strong rounded-3xl p-7 animate-pop shadow-2xl">
                <div className="flex items-start gap-4">
                    <div
                        className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-md ${
                            dialog.danger
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/30'
                                : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand-500/30'
                        }`}
                    >
                        <FaExclamationTriangle />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2
                            id="confirm-title"
                            className="text-lg font-bold text-ink-900 tracking-tight"
                        >
                            {dialog.title}
                        </h2>
                        {dialog.body && (
                            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                                {dialog.body}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={() => close(false)}
                        className="btn-secondary"
                        autoFocus={!dialog.danger}
                    >
                        {dialog.cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => close(true)}
                        className={
                            dialog.danger
                                ? 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white font-semibold text-sm shadow-lg shadow-red-500/30 hover:brightness-110 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all duration-200'
                                : 'btn-primary'
                        }
                        autoFocus={dialog.danger}
                    >
                        {dialog.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
