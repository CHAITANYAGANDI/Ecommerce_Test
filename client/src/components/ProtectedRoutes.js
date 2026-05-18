import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCopy, FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaTrashAlt } from 'react-icons/fa';
import { handleSuccess, handleError, logoutAdmin, apiFetch, showConfirm } from '../utils';
import AdminShell from './AdminShell';

const CredentialsTable = () => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logoutAdmin();
    handleSuccess('Logged out successfully');
    setTimeout(() => navigate('/admin/login'), 800);
  }, [navigate]);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/client/creds');
      if (response.ok) {
        const responseData = await response.json();
        setCredentials(responseData.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message && errorData.message.toLowerCase().includes('token has expired')) {
          handleLogout();
        }
        console.error('Failed to fetch credentials:', errorData.message);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const copyToken = async (token, id) => {
    try {
      await navigator.clipboard.writeText(token);
      handleSuccess('Token copied to clipboard');
    } catch {
      handleError('Could not copy to clipboard');
    }
  };

  const deleteCredential = async (credential) => {
    const ok = await showConfirm({
      title: 'Delete this authorized API?',
      body: `${credential.api_name || 'This API'} will be disconnected and the gateway will no longer have its stored access token.`,
      confirmLabel: 'Delete API',
      cancelLabel: 'Cancel',
      danger: true
    });
    if (!ok) return;

    setDeletingId(credential._id);
    try {
      const response = await apiFetch(`/admin/client/creds/${credential._id}`, {
        method: 'DELETE'
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success) {
        handleSuccess(result.message || 'Authorized API deleted');
        setCredentials((prev) => prev.filter((item) => item._id !== credential._id));
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[credential._id];
          return next;
        });
      } else {
        handleError(result.message || 'Failed to delete authorized API');
      }
    } catch (error) {
      handleError(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const maskToken = (token) => {
    if (!token) return '—';
    if (token.length <= 12) return token;
    return `${token.slice(0, 6)}••••••••${token.slice(-4)}`;
  };

  return (
    <AdminShell
      title="Authorized APIs"
      subtitle="Active provider tokens used by the API Gateway."
    >
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-ink-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
            <FaShieldAlt />
          </div>
          <div>
            <h2 className="font-bold text-ink-900">API credentials</h2>
            <p className="text-xs text-ink-500">
              {loading ? 'Loading…' : `${credentials.length} connection${credentials.length === 1 ? '' : 's'} configured`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-ink-500">Loading credentials…</div>
        ) : credentials.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <FaExclamationTriangle />
            </div>
            <h3 className="mt-4 font-bold text-ink-900">No API authorizations yet</h3>
            <p className="text-sm text-ink-500 mt-2">
              Request a provider authorization to wire up an upstream API.
            </p>
            <button onClick={() => navigate('/admin/auth/request')} className="btn-primary mt-5">
              Request authorization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100 bg-ink-50/50">
                  <th className="px-5 py-3.5">API name</th>
                  <th className="px-5 py-3.5">API URL</th>
                  <th className="px-5 py-3.5">Access token</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((credential) => (
                  <tr key={credential._id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-ink-900">
                      {credential.api_name}
                    </td>
                    <td className="px-5 py-4 text-ink-600">
                      <code className="px-2 py-1 rounded-lg bg-ink-100 text-xs">
                        {credential.api_url}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 rounded-lg bg-ink-100 text-xs text-ink-700 max-w-[280px] truncate">
                          {revealed[credential._id] ? credential.access_token : maskToken(credential.access_token)}
                        </code>
                        <button
                          onClick={() => setRevealed((p) => ({ ...p, [credential._id]: !p[credential._id] }))}
                          className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {revealed[credential._id] ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => copyToken(credential.access_token, credential._id)}
                          className="p-1.5 rounded-full hover:bg-ink-100 text-ink-500 hover:text-ink-800 transition-colors"
                          aria-label="Copy token"
                        >
                          <FaCopy className="text-xs" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="chip-success">
                        <FaCheckCircle /> Active
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteCredential(credential)}
                        disabled={deletingId === credential._id}
                        className="p-2 rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete authorized API"
                        aria-label={`Delete ${credential.api_name || 'authorized API'}`}
                      >
                        <FaTrashAlt className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default CredentialsTable;
