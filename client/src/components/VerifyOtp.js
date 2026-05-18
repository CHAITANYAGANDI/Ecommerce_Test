import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { handleError, handleSuccess, apiFetch } from '../utils';
import AuthLayout from './AuthLayout';

function VerifyOtp() {
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 4) return handleError('Please enter a 4-digit OTP');

        setSubmitting(true);
        try {
            const response = await apiFetch('/recovery/verifyotp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp }),
            });
            const result = await response.json();
            if (result.success) {
                handleSuccess(result.message);
                setTimeout(() => navigate('/resetpassword'), 800);
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
            title="Enter your code"
            subtitle="Check your inbox — we sent a 4-digit code. Enter it below to continue."
            panelTitle="Almost there."
            panelSubtitle="The code expires in a few minutes for your security. If you don't see it, check your spam folder."
            footer={
                <>
                    Didn't get a code?{' '}
                    <Link to="/forgotpassword" className="font-semibold text-brand-700 hover:underline">
                        Send a new one
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
                    {submitting ? 'Verifying…' : <>Verify code <FaArrowRight className="text-xs" /></>}
                </button>
            </form>
        </AuthLayout>
    );
}

export default VerifyOtp;
