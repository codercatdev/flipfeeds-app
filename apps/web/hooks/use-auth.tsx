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
    let previousUser: User | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Sync session cookie with Firebase auth state
      try {
        if (currentUser) {
          // User is signed in - get fresh token and set cookie
          const token = await currentUser.getIdToken();
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            console.warn('[Auth] Failed to set session cookie:', response.status);
          } else {
            console.log('[Auth] Session cookie set for user:', currentUser.uid);
          }
        } else if (previousUser) {
          // User signed out (not initial load) - clear the cookie
          const response = await fetch('/api/auth/session', {
            method: 'DELETE',
          });

          if (!response.ok) {
            console.warn('[Auth] Failed to clear session cookie:', response.status);
          } else {
            console.log('[Auth] Session cookie cleared');
          }

          // Redirect to signin after actual signout
          router.push('/signin');
        }
      } catch (error) {
        console.error('[Auth] Failed to sync session cookie:', error);
        // Don't throw - allow app to continue even if session sync fails
      }

      // Update previous user for next iteration
      previousUser = currentUser;
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
