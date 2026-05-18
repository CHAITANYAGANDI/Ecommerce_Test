import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaUserShield } from 'react-icons/fa';
import { handleSuccess, logoutAdmin, apiFetch, isStrongPassword, STRONG_PASSWORD_MESSAGE } from '../utils';
import AdminShell from './AdminShell';
import FormErrorBanner from './FormErrorBanner';
import PasswordStrengthHint from './PasswordStrengthHint';

function AdminRegistration() {
    const [formData, setFormData] = useState({ name: '', adminId: '', password: '' });
    const [errorBanner, setErrorBanner] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutAdmin();
        handleSuccess('Logged out successfully');
        setTimeout(() => navigate('/admin/login'), 800);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errorBanner) setErrorBanner('');
    };

    const showWeakPasswordError = () => {
        setErrorBanner(STRONG_PASSWORD_MESSAGE);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, adminId, password } = formData;
        if (!name || !adminId || !password) return setErrorBanner('All fields are required');
        if (!isStrongPassword(password)) return showWeakPasswordError();

        setSubmitting(true);
        setErrorBanner('');
        try {
            const response = await apiFetch('/admin/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json().catch(() => ({}));
            const { success, message, error } = result;
            if (response.ok && success) {
                handleSuccess(message);
                setTimeout(() => navigate('/admin/dashboard'), 800);
            } else if (error) {
                const detailMessage = error?.details?.[0]?.message;
                if (detailMessage === STRONG_PASSWORD_MESSAGE || error?.details?.[0]?.path?.[0] === 'password') {
                    showWeakPasswordError();
                    return;
                }
                setErrorBanner(detailMessage || 'Admin registration failed');
            } else {
                if (message && message.toLowerCase().includes('token has expired')) {
                    handleLogout();
                    return;
                }
                setErrorBanner(message || 'Admin registration failed. Please try again.');
            }
        } catch (err) {
            setErrorBanner(err.message || 'Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminShell
            title="Add an admin"
            subtitle="Create a new operator account for the back office."
        >
            <div className="max-w-2xl">
                <div className="card p-8">
                    <div className="flex items-start gap-4 pb-6 border-b border-ink-100 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                            <FaUserShield className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-ink-900">Create admin account</h2>
                            <p className="text-sm text-ink-500 mt-1">
                                Pick a strong password. Admins can manage users, sellers, and API
                                authorizations across the platform.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormErrorBanner message={errorBanner} />
                        <div>
                            <label htmlFor="name" className="field-label">Name</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                placeholder="Jane Doe"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                autoFocus
                                className="field-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="adminId" className="field-label">Admin ID</label>
                            <input
                                id="adminId"
                                type="text"
                                name="adminId"
                                placeholder="e.g. jdoe.admin"
                                value={formData.adminId}
                                onChange={handleChange}
                                required
                                className="field-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="field-label">Password</label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="At least 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="field-input"
                            />
                            <PasswordStrengthHint password={formData.password} />
                        </div>
                        <div className="pt-3 flex flex-wrap gap-3 justify-end">
                            <button type="button" onClick={() => navigate('/admin/dashboard')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} className="btn-primary">
                                {submitting ? 'Creating…' : <>Add admin <FaArrowRight className="text-xs" /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminShell>
    );
}

export default AdminRegistration;
