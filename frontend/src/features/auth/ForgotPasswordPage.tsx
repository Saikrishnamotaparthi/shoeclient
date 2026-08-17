import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/user-not-found') setError('No account found with this email address.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email address.');
      else setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="bg-white border border-border rounded-xl p-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Mail size={22} className="text-primary" />
          </div>

          {sent ? (
            <div>
              <h1 className="text-2xl font-display font-semibold mb-3">Check your email</h1>
              <p className="text-text-muted mb-6">
                We've sent a password reset link to <strong className="text-text">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <p className="text-sm text-text-muted">
                Didn't receive it?{' '}
                <button onClick={() => setSent(false)} className="text-primary hover:underline font-medium">
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-display font-semibold mb-2">Forgot password?</h1>
              <p className="text-text-muted text-sm mb-6">
                Enter the email address linked to your account and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="reset-email">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
