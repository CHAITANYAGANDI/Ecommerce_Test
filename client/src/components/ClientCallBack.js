import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils';

function ClientCallBack() {
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchClient() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const clientId = urlParams.get('client_id');
        const redirectUri = urlParams.get('redirectUri');
        const username = urlParams.get('username');

        const requestBody = { clientId, redirectUri, username };

        const response = await apiFetch('/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) navigate('/admin/dashboard');
        else console.error('Failed to authenticate');
      } catch (error) {
        console.error('Error handling callback:', error);
      }
    }
    fetchClient();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-10 max-w-md w-full text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        <h2 className="mt-5 text-xl font-bold text-ink-900">Finalizing authorization…</h2>
        <p className="text-sm text-ink-500 mt-2">
          Storing the access token and redirecting you to the admin dashboard.
        </p>
      </div>
    </div>
  );
}

export default ClientCallBack;
