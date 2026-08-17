import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone } from 'lucide-react';

/**
 * GoogleOnboarding — shown as a modal overlay when a Google Sign-In user has
 * no Firestore profile yet (phone is empty / doc doesn't exist).
 * Collects name + phone, writes to Firestore, then refreshes the auth context.
 */
const GoogleOnboarding: React.FC = () => {
  const { user, firebaseUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Show this modal if user is authenticated via Google but has no phone set
  useEffect(() => {
    if (user && !user.phone) {
      setName(user.name || '');
      setShow(true);
    } else {
      setShow(false);
    }
  }, [user]);

  if (!show || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.id), {
        name: name.trim(),
        phone: phone.trim(),
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await refreshUser();
      setShow(false);
    } catch {
      setError('Failed to save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <User size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold">One last step!</h2>
            <p className="text-sm text-text-muted">Tell us a bit about yourself to complete setup.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="onboard-name">
              Full Name <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="onboard-name"
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
            <label className="block text-sm font-medium mb-1" htmlFor="onboard-phone">
              Mobile Number <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-text-muted">
                <Phone size={14} />
                <span className="text-sm font-medium">+91</span>
              </div>
              <input
                id="onboard-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                placeholder="10-digit mobile number"
                className="w-full border border-border rounded pl-16 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Required for order delivery and tracking.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Saving…' : 'Complete Setup →'}
          </button>
        </form>

        <p className="text-xs text-text-muted text-center mt-4">
          Your information is secure and only used for order delivery.
        </p>
      </div>
    </div>
  );
};

export default GoogleOnboarding;
