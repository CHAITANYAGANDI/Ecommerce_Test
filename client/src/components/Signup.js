import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { handleSuccess, apiFetch, isStrongPassword, STRONG_PASSWORD_MESSAGE } from '../utils';
import AuthLayout from './AuthLayout';
import FormErrorBanner from './FormErrorBanner';
import PasswordStrengthHint from './PasswordStrengthHint';

function Signup() {
    const [signupInfo, setSignupInfo] = useState({ name: '', email: '', password: '' });
    const [errorBanner, setErrorBanner] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSignupInfo((prev) => ({ ...prev, [name]: value }));
        if (errorBanner) setErrorBanner('');
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        const { name, email, password } = signupInfo;

        if (!name || !email || !password) {
            return setErrorBanner('Name, email, and password are required');
        }

        if (!isStrongPassword(password)) {
            return setErrorBanner(STRONG_PASSWORD_MESSAGE);
        }

        setSubmitting(true);
        setErrorBanner('');
        try {
            const response = await apiFetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupInfo),
            });
            const result = await response.json().catch(() => ({}));
            const { success, message, error } = result;
            if (response.ok && success) {
                handleSuccess(message);
                setTimeout(() => navigate('/verify-signup'), 800);
            } else if (error) {
                setErrorBanner(error?.details?.[0]?.message || 'Signup failed');
            } else {
                setErrorBanner(message || 'Signup failed. Please try again.');
            }
        } catch (err) {
            setErrorBanner(err.message || 'Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Shop smarter across stores. Get started in under a minute."
            panelTitle="The smartest way to shop across stores."
            panelSubtitle="Sign up to track prices, get drop alerts, and ask AI for buy-or-wait advice — all in one cart, across Amazon, Walmart and more."
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSignup} className="space-y-4">
                <FormErrorBanner message={errorBanner} />
                <div>
                    <label htmlFor="name" className="field-label">Full name</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoFocus
                        autoComplete="name"
                        placeholder="Jane Doe"
                        value={signupInfo.name}
                        onChange={handleChange}
                        className="field-input"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="field-label">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={signupInfo.email}
                        onChange={handleChange}
                        className="field-input"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="field-label">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={signupInfo.password}
                        onChange={handleChange}
                        className="field-input"
                    />
                    <PasswordStrengthHint password={signupInfo.password} />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5">
                    {submitting ? 'Creating account…' : <>Create account <FaArrowRight className="text-xs" /></>}
                </button>

                <p className="text-xs text-ink-500 text-center leading-relaxed">
                    By creating an account, you agree to our terms. We'll email you a
                    4-digit code to verify it's really you.
                </p>
            </form>
        </AuthLayout>
    );
}

export default Signup;
