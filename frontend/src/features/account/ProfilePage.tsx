import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { User, Phone, Mail, Camera, CheckCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    try {
      await authService.updateProfile(name.trim(), phone.trim());
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Profile Settings</h1>
        <p className="text-text-muted text-sm mt-1">Update your personal information.</p>
      </div>

      <div className="bg-white border border-border rounded-xl p-6">
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            <CheckCircle size={16} /> Profile updated successfully!
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="profile-name">
              Full Name <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full border border-border rounded pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="profile-email">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full border border-border rounded pl-9 pr-4 py-2.5 text-sm bg-surface text-text-muted cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Email cannot be changed here. Contact support if needed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="profile-phone">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-text-muted">
                <Phone size={14} />
                <span className="text-sm">+91</span>
              </div>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className="w-full border border-border rounded pl-16 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
