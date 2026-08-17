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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dob: z.string().nonempty('Date of birth is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setError(null);
      
      const user = await authService.register(data.email, data.password, data.name);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: data.name,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        isAdmin: false,
        createdAt: new Date().toISOString()
      });

      // Send verification email
      await authService.verifyEmail();
      
      // Navigate to verification page
      navigate('/verify-email', { state: { email: data.email } });
    } catch (err: any) {
      setError(normalizeAuthError(err));
    }
  };

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
          type="text"
          placeholder="Full Name"
          {...register('name')}
          error={errors.name?.message}
        />
        
        <Input
          type="email"
          placeholder="Email Address"
          {...register('email')}
          error={errors.email?.message}
        />
        
        <Input
          type="tel"
          placeholder="Phone Number"
          {...register('phone')}
          error={errors.phone?.message}
        />
        
        <Input
          type="date"
          placeholder="Date of Birth"
          {...register('dob')}
          error={errors.dob?.message}
        />
        
        <Input
          type="password"
          placeholder="Password"
          {...register('password')}
          error={errors.password?.message}
        />

        <p className="text-xs text-text-muted py-2">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

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
