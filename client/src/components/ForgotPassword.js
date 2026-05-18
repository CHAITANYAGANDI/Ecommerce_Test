import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEnvelope } from 'react-icons/fa';
import { handleError, handleSuccess, apiFetch } from '../utils';
import AuthLayout from './AuthLayout';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) return handleError('Email is required');

        setSubmitting(true);
        try {
            const response = await apiFetch('/recovery/forgotpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const result = await response.json();
            if (result.success) {
                handleSuccess(result.message);
                setTimeout(() => navigate('/verifyotp'), 800);
            } else {
                handleError(result.message);
            }
        } catch (err) {
            handleError('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Forgot your password?"
            subtitle="Enter the email on your account and we'll send you a 4-digit code to reset it."
            panelTitle="We'll get you back in quickly."
            panelSubtitle="Password recovery is fast and secure. We send you a fresh code each time and never share your email."
            footer={
                <>
                    Remembered it?{' '}
                    <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                        Back to sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                    <label htmlFor="email" className="field-label">Email</label>
                    <div className="relative">
                        <FaEnvelope className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-400 text-sm" />
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            className="field-input !pl-12"
                        />
                    </div>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5">
                    {submitting ? 'Sending…' : <>Send code <FaArrowRight className="text-xs" /></>}
                </button>
            </form>
        </AuthLayout>
    );
}

export default ForgotPassword;
