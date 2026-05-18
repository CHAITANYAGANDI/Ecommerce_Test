import React from 'react';
import { AUTH_API_BASE } from '../utils';

export function GoogleDivider() {
    return (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#dce9ff]" />
            </div>
            <div className="relative flex justify-center">
                <span
                    className="px-3 text-xs uppercase tracking-wider bg-white"
                    style={{ color: '#5f5e5e' }}
                >
                    or
                </span>
            </div>
        </div>
    );
}

function GoogleSignInButton({ label = 'Sign in with Google' }) {
    const handleClick = () => {
        window.location.href = `${AUTH_API_BASE}/google`;
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded border bg-white transition-colors cursor-pointer"
            style={{
                color: '#0b1c30',
                borderColor: '#dce9ff'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8f9ff';
                e.currentTarget.style.borderColor = '#426fe7';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#dce9ff';
            }}
        >
            <GoogleGlyph />
            <span className="text-sm font-headline font-semibold">{label}</span>
        </button>
    );
}

function GoogleGlyph() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
        </svg>
    );
}

export default GoogleSignInButton;
