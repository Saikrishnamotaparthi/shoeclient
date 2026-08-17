import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as AppUser } from '@/types';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { authService } from '@/services/auth';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async (currentUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setUser({
          id: currentUser.uid,
          email: currentUser.email || '',
          name: d.name || currentUser.displayName || 'User',
          phone: d.phone || '',
          isAdmin: d.isAdmin || false,
          createdAt: d.createdAt || new Date().toISOString(),
        });
      } else {
        // Firestore doc doesn't exist yet (e.g. new Google sign-in)
        const idTokenResult = await currentUser.getIdTokenResult();
        setUser({
          id: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || 'User',
          phone: '',
          isAdmin: !!idTokenResult.claims.admin,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        await loadUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await authService.logout();
  };

  const refreshUser = async () => {
    if (firebaseUser) await loadUser(firebaseUser);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
