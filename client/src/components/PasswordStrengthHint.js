import React from 'react';
import { scorePassword } from '../utils';

const STRENGTH_COLORS = ['#e5e7eb', '#ef4444', '#f59e0b', '#eab308', '#10b981'];
const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

function PasswordStrengthHint({ password }) {
    const score = scorePassword(password);
    const activeColor = STRENGTH_COLORS[score];

    return (
        <div className="mt-2">
            <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="h-1 w-full rounded-full transition-colors"
                        style={{ background: i <= score ? activeColor : '#e5e7eb' }}
                    />
                ))}
            </div>
            <p
                className="text-xs mt-1.5 leading-relaxed"
                style={{ color: password ? activeColor : '#64748b' }}
            >
                {password
                    ? `${STRENGTH_LABELS[score]} - use 8+ chars with uppercase, lowercase, and a digit.`
                    : 'Use 8+ characters with uppercase, lowercase, and a digit.'}
            </p>
        </div>
    );
}

export default PasswordStrengthHint;
