import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrashAlt, FaSearch, FaUsers, FaUserShield } from 'react-icons/fa';
import { handleError, handleSuccess, logoutAdmin, apiFetch, showConfirm } from '../utils';
import AdminShell from './AdminShell';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutAdmin();
    handleSuccess('Logged out successfully');
    setTimeout(() => navigate('/admin/login'), 800);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/users/get');
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      } else {
        const errorData = await response.json();
        if (errorData.message && errorData.message.toLowerCase().includes('token has expired')) {
          handleLogout();
        }
        handleError(errorData.message || 'Failed to fetch users');
      }
    } catch (error) {
      handleError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAdmin = async (email) => {
    const ok = await showConfirm({
      title: 'Delete this admin?',
      body: 'They will lose access to the back office immediately. This cannot be undone.',
      confirmLabel: 'Delete admin',
      cancelLabel: 'Cancel',
      danger: true
    });
    if (!ok) return;
    try {
      const response = await apiFetch(`/admin/users/delete/${email}`, { method: 'DELETE' });
      if (response.ok) {
        handleSuccess('Admin deleted successfully');
        setUsers(users.filter((user) => user.email !== email));
      } else {
        const errorData = await response.json();
        handleError(errorData.message || 'Failed to delete admin');
      }
    } catch (error) {
      handleError(error.message);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => (u.role || '').toLowerCase() === roleFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, query, roleFilter]);

  const adminCount = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
  const userCount = users.length - adminCount;

  return (
    <AdminShell
      title="User management"
      subtitle="View accounts on the platform and remove admin operators."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <FaUsers />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Total accounts</p>
            <p className="text-xl font-bold text-ink-900">{users.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FaUsers />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Shoppers</p>
            <p className="text-xl font-bold text-ink-900">{userCount}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <FaUserShield />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Admins</p>
            <p className="text-xl font-bold text-ink-900">{adminCount}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-ink-100 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-11 pr-4 py-2 rounded-full bg-white border border-ink-200 text-sm focus:outline-none focus:border-brand-400 focus:shadow-focus transition-all"
            />
          </div>
          <div className="flex gap-2 sm:ml-auto">
            {[
              { id: 'all', label: 'Everyone' },
              { id: 'user', label: 'Shoppers' },
              { id: 'admin', label: 'Admins' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRoleFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${roleFilter === opt.id
                    ? 'bg-brand-gradient text-white shadow-md shadow-brand-500/30'
                    : 'bg-white border border-ink-200/80 text-ink-700 hover:border-brand-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-ink-500">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-500">
            No users match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100 bg-ink-50/50">
                  <th className="px-5 py-3.5 w-10">#</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, index) => {
                  const isAdmin = (user.role || '').toLowerCase() === 'admin';
                  const initial = user.name?.[0]?.toUpperCase() || '?';
                  return (
                    <tr key={user.email} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40 transition-colors">
                      <td className="px-5 py-3 text-ink-500 text-xs">{index + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-full ${isAdmin ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-brand-gradient'} text-white text-sm font-bold flex items-center justify-center shadow-md`}>
                            {initial}
                          </span>
                          <span className="font-semibold text-ink-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-600">{user.email}</td>
                      <td className="px-5 py-3">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            <FaUserShield /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                            Shopper
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => deleteAdmin(user.email)}
                            className="p-2 rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete admin"
                          >
                            <FaTrashAlt className="text-sm" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default UserManagement;
