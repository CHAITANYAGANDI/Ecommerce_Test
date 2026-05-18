import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { handleError, handleSuccess, apiFetch } from '../utils';
import AuthLayout from './AuthLayout';

function VerifySignupOtp() {
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 4) return handleError('Please enter a 4-digit OTP');

        setSubmitting(true);
        try {
            const response = await apiFetch('/auth/signup/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp }),
            });
            const result = await response.json();
            if (result.success) {
                handleSuccess(result.message);
                setTimeout(() => navigate('/home'), 800);
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
            title="Verify your email"
            subtitle="We sent a 4-digit code to your email. Enter it below to finish creating your account."
            panelTitle="One last step."
            panelSubtitle="Verifying your email keeps your cart and order history safe — and stops anyone else from signing up with it."
            footer={
                <>
                    Wrong email?{' '}
                    <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
                        Start over
                    </Link>
                </>
            }
        >
            <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                    <label htmlFor="otp" className="field-label">4-digit code</label>
                    <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="• • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength="4"
                        required
                        autoFocus
                        className="field-input text-center !text-3xl !tracking-[0.6em] !font-bold"
                    />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5">
                    {submitting ? 'Verifying…' : <>Verify and continue <FaArrowRight className="text-xs" /></>}
                </button>
            </form>
        </AuthLayout>
    );
}

export default VerifySignupOtp;
