import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

function FormErrorBanner({ message }) {
    if (!message) return null;

    return (
        <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 flex items-start gap-3"
            role="alert"
        >
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            <span className="leading-relaxed">{message}</span>
        </div>
    );
}

export default FormErrorBanner;
