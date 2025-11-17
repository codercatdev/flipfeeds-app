'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const previousUser = user;
      setUser(user);
      setLoading(false);

      // Sync session cookie with Firebase auth state
      try {
        if (user) {
          // User is signed in - get fresh token and set cookie
          const token = await user.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          console.log('[Auth] Session cookie set for user:', user.uid);
        } else {
          // User signed out - clear the cookie
          await fetch('/api/auth/session', {
            method: 'DELETE',
          });
          console.log('[Auth] Session cookie cleared');

          // Redirect to signin if we had a user before (actual signout, not initial load)
          if (previousUser !== null) {
            router.push('/signin');
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to sync session cookie:', error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const Provider = AuthContext.Provider as any;
  return <Provider value={{ user, loading }}>{children}</Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
