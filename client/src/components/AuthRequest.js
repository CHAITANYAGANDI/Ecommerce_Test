import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaKey } from 'react-icons/fa';
import { handleError, handleSuccess, logoutAdmin, apiFetch, AUTH_SERVER_URL, CLIENT_URL } from '../utils';
import AdminShell from './AdminShell';

function RequestAuthorization() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        apiName: '',
        clientId: '',
        clientSecret: '',
        redirectUri: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleLogout = async () => {
        await logoutAdmin();
        handleSuccess('Logged out successfully');
        setTimeout(() => navigate('/admin/login'), 800);
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        const { apiName, clientId, clientSecret, redirectUri } = formData;
        if (!apiName || !clientId || !clientSecret || !redirectUri) {
            return handleError('All fields are required');
        }

        setSubmitting(true);
        try {
            const response = await apiFetch('/admin/client/details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const callbackUrl = encodeURIComponent(
                    `${CLIENT_URL}/admin/client/callback?fromLogin=true`
                );
                window.location.href = `${AUTH_SERVER_URL}/auth/client/login?callbackUrl=${callbackUrl}&client_id=${encodeURIComponent(clientId)}`;
            } else {
                const errorData = await response.json();
                if (errorData.message && errorData.message.toLowerCase().includes('token has expired')) {
                    handleLogout();
                } else {
                    handleError(errorData.message || 'Authorization failed');
                }
            }
        } catch (err) {
            handleError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminShell
            title="Request API authorization"
            subtitle="Connect a new upstream provider so the gateway can fetch products on your behalf."
        >
            <div className="max-w-3xl">
                <div className="card p-8">
                    <div className="flex items-start gap-4 pb-6 border-b border-ink-100 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                            <FaKey />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-ink-900">Provider authorization request</h2>
                            <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                                We'll redirect you to the provider's login page. Once you sign
                                in there, we'll receive an access token and store it
                                server-side so the gateway can use it.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="apiName" className="field-label">API name</label>
                            <input
                                id="apiName"
                                type="text"
                                name="apiName"
                                placeholder="e.g. Amazon_Products"
                                value={formData.apiName}
                                onChange={handleChange}
                                required
                                autoFocus
                                className="field-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="clientId" className="field-label">Client ID</label>
                            <input
                                id="clientId"
                                type="text"
                                name="clientId"
                                placeholder="From the provider"
                                value={formData.clientId}
                                onChange={handleChange}
                                required
                                className="field-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="clientSecret" className="field-label">Client secret</label>
                            <input
                                id="clientSecret"
                                type="password"
                                name="clientSecret"
                                placeholder="Stored encrypted at rest"
                                value={formData.clientSecret}
                                onChange={handleChange}
                                required
                                className="field-input"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="redirectUri" className="field-label">Redirect URI</label>
                            <input
                                id="redirectUri"
                                type="url"
                                name="redirectUri"
                                placeholder="https://provider.example.com/oauth/callback"
                                value={formData.redirectUri}
                                onChange={handleChange}
                                required
                                className="field-input"
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-wrap gap-3 justify-end pt-4">
                            <button type="button" onClick={() => navigate('/admin/auth')} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} className="btn-primary">
                                {submitting ? 'Authorizing…' : <>Authorize <FaArrowRight className="text-xs" /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminShell>
    );
}

export default RequestAuthorization;
