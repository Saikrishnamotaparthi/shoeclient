import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from './api';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const authService = {
  async register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name on Firebase user
    try {
      await updateProfile(userCredential.user, { displayName: name });
    } catch {}

    // Sync to backend
    try {
      await api.post('/auth/profile', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name,
      });
    } catch (e) {
      console.error('Failed to sync profile after registration', e);
    }

    return userCredential.user;
  },

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async loginWithGoogle() {
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // Handle popup-specific errors
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      }
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      }
      if (err.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in cancelled.');
      }
      if (err.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw err;
    }

    // Sync to backend — don't fail login if this fails
    try {
      await api.post('/auth/profile', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Customer',
      });
    } catch (e) {
      console.error('Failed to sync profile after Google login', e);
      // Don't throw — login was successful, profile sync is optional
    }

    return userCredential.user;
  },

  async logout() {
    return signOut(auth);
  },

  async resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  },

  async verifyEmail() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in.');
    }
    // Reload user to get fresh state
    await user.reload();
    if (user.emailVerified) {
      return; // Already verified
    }
    return sendEmailVerification(user);
  },

  async updateProfile(name: string, phone?: string) {
    // Update Firebase display name
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: name });
      } catch {}
    }
    // Update backend
    const response = await api.put('/auth/profile', { name, phone });
    return response.data;
  },
};

export const normalizeAuthError = (error: any): string => {
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 8 characters.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your connection.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (message.includes('popup')) {
    return message;
  }
  return message || 'An authentication error occurred.';
};
