import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { authService, normalizeAuthError } from '@/services/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setError(null);

      const user = await authService.register(data.email, data.password, data.email.split('@')[0]);

      // Create minimal user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: data.email.split('@')[0],
        email: data.email,
        phone: '',
        isAdmin: false,
        createdAt: new Date().toISOString(),
      });

      // Send verification email
      try {
        await authService.verifyEmail();
        setVerificationSent(true);
        setRegisteredEmail(data.email);
      } catch (verifyErr: any) {
        console.error('Verification email failed:', verifyErr);
        // Still navigate — user can resend later
        setVerificationSent(true);
        setRegisteredEmail(data.email);
      }
    } catch (err: any) {
      setError(normalizeAuthError(err));
    }
  };

  if (verificationSent) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 animate-fade-in text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-display font-semibold mb-2">Check your email</h1>
        <p className="text-text-muted mb-4">
          We've sent a verification link to <strong>{registeredEmail}</strong>.
          Click the link to activate your account.
        </p>
        <p className="text-sm text-text-muted mb-6">
          Didn't receive it? Check your spam folder or{' '}
          <button
            onClick={async () => {
              try { await authService.verifyEmail(); } catch {}
            }}
            className="text-primary font-medium hover:underline"
          >
            resend verification email
          </button>.
        </p>
        <Link to="/login" className="text-primary font-medium hover:underline text-sm">
          ← Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4 animate-fade-in">
      <h1 className="text-3xl font-display mb-2">Create Account</h1>
      <p className="text-text-muted mb-8">Join SoleVault for exclusive releases and faster checkout.</p>

      {error && (
        <div className="bg-danger/10 text-danger p-3 mb-6 text-sm border border-danger/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          type="email"
          placeholder="Email Address"
          {...register('email')}
          error={errors.email?.message}
        />

        <Input
          type="password"
          placeholder="Password (min 8 characters)"
          {...register('password')}
          error={errors.password?.message}
        />

        <p className="text-xs text-text-muted py-2">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
          You can add your name and phone number later in your profile.
        </p>

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-surface text-text-muted">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        fullWidth
        onClick={async () => {
          try {
            setError(null);
            await authService.loginWithGoogle();
          } catch (err: any) {
            setError(normalizeAuthError(err));
          }
        }}
        className="mb-8"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </Button>

      <p className="text-center text-sm text-text-muted mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default SignupPage;
