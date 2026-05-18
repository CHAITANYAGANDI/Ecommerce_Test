import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { handleError, handleSuccess, apiFetch } from '../utils';
import AuthLayout from './AuthLayout';

function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!password || !confirmPassword) return handleError('Both fields are required');
        if (password !== confirmPassword) return handleError('Passwords do not match');

        setSubmitting(true);
        try {
            const response = await apiFetch('/recovery/resetpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const result = await response.json();
            if (result.success) {
                handleSuccess(result.message);
                setTimeout(() => navigate('/login'), 800);
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
            title="Set a new password"
            subtitle="Choose something strong and unique. You'll use this from now on."
            panelTitle="Choose a strong new password."
            panelSubtitle="Use at least 8 characters with a mix of letters, numbers and symbols. We hash everything — your password is never stored in plaintext."
            footer={
                <>
                    Changed your mind?{' '}
                    <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                        Back to sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                    <label htmlFor="password" className="field-label">New password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                        className="field-input"
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="field-label">Confirm new password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Type it again"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="field-input"
                    />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5">
                    {submitting ? 'Updating…' : <>Update password <FaArrowRight className="text-xs" /></>}
                </button>
            </form>
        </AuthLayout>
    );
}

export default ResetPassword;
