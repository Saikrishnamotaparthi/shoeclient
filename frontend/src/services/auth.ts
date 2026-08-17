import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  sendEmailVerification 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from './api';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  async register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await api.post('/auth/profile', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name
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
    const userCredential = await signInWithPopup(auth, googleProvider);
    try {
      await api.post('/auth/profile', { 
        uid: userCredential.user.uid, 
        email: userCredential.user.email,
        name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Customer'
      });
    } catch (e) {
      console.error('Failed to sync profile after Google login', e);
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
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }
    throw new Error('No user is currently signed in.');
  },

  async updateProfile(name: string, phone?: string) {
    const response = await api.put('/auth/profile', { name, phone });
    return response.data;
  }
};

export const normalizeAuthError = (error: any): string => {
  const code = error.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  return error.message || 'An authentication error occurred.';
};
