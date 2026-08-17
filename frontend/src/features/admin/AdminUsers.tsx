import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import AdminLayout from '@/layouts/AdminLayout';
import { Shield, UserPlus, Trash2, Edit2, X, Check, AlertCircle, Users as UsersIcon } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  lastLogin: string;
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'INVENTORY_MANAGER', 'CONTENT_MANAGER', 'SUPPORT'];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  ORDER_MANAGER: 'Order Manager',
  INVENTORY_MANAGER: 'Inventory Manager',
  CONTENT_MANAGER: 'Content Manager',
  SUPPORT: 'Support',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-50 text-red-600 border-red-200',
  ADMIN: 'bg-purple-50 text-purple-600 border-purple-200',
  ORDER_MANAGER: 'bg-blue-50 text-blue-600 border-blue-200',
  INVENTORY_MANAGER: 'bg-amber-50 text-amber-600 border-amber-200',
  CONTENT_MANAGER: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  SUPPORT: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const AdminUsers = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('ADMIN');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit form state
  const [editRole, setEditRole] = useState('');
  const [editName, setEditName] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setAdmins(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch admin users', err);
      setError('Failed to load admin users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAdd = async () => {
    if (!addEmail.trim()) { setAddError('Email is required'); return; }
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/admin/users', { email: addEmail.trim(), name: addName.trim(), role: addRole });
      setShowAddForm(false);
      setAddEmail('');
      setAddName('');
      setAddRole('ADMIN');
      fetchAdmins();
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Failed to add admin user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}`, { role: editRole, name: editName });
      setEditingId(null);
      fetchAdmins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update admin user');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove admin access for ${name || 'this user'}?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchAdmins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove admin user');
    }
  };

  const startEdit = (admin: AdminUser) => {
    setEditingId(admin.id);
    setEditRole(admin.role || 'ADMIN');
    setEditName(admin.name || '');
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage who has admin access to the panel</p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setAddError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus size={16} /> Add Admin
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Grant Admin Access</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">The user must have already signed up with their email. Enter their email to grant admin access.</p>

            {addError && (
              <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{addError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={14} />}
                Grant Access
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Admin Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <UsersIcon size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 mb-2">No admin users found</p>
            <button onClick={() => setShowAddForm(true)} className="text-primary text-sm hover:underline">Add the first admin</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {admins.map(admin => (
                <div key={admin.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  {editingId === admin.id ? (
                    /* Edit Mode */
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary shrink-0">
                          {(admin.name || admin.email || 'A')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Display name"
                          />
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                        <button onClick={() => handleUpdate(admin.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary shrink-0">
                          {(admin.name || admin.email || 'A')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{admin.name || 'No Name'}</p>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${ROLE_COLORS[admin.role] || ROLE_COLORS.ADMIN}`}>
                              {ROLE_LABELS[admin.role] || admin.role}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(admin)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(admin.id, admin.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove admin access">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {admins.length} admin user{admins.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};
