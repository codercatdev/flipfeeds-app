'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getClientAuth } from '@/lib/firebase';

export default function SignIn() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [sessionSyncFailed, setSessionSyncFailed] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    // Check !loading to avoid race condition with manual sign-in
    // Check !sessionSyncFailed to avoid infinite loop if server is broken
    if (!authLoading && user && !isRedirecting && !loading && !sessionSyncFailed) {
      const syncAndRedirect = async () => {
        try {
          setIsRedirecting(true);
          // Ensure session cookie is set before redirecting
          const token = await user.getIdToken();
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.details || errorData.error || `Session sync failed: ${response.statusText}`
            );
          }

          // Use window.location for full page reload to ensure server sees the session
          window.location.href = '/feeds';
        } catch (error) {
          console.error('Auto-redirect session sync failed:', error);
          setIsRedirecting(false);
          setSessionSyncFailed(true);
          setError('Failed to synchronize session. Please try signing in again.');
        }
      };

      syncAndRedirect();
    }
  }, [user, authLoading, isRedirecting, loading, sessionSyncFailed]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);

      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // User signed in successfully
      console.log('User signed in:', result.user.email);

      // Wait for the ID token and create session cookie
      const token = await result.user.getIdToken();

      console.log('[SignIn] Attempting to create session cookie...');
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        console.error('[SignIn] Session creation failed:', sessionResponse.status, errorData);

        // Show detailed error to help with debugging
        const errorDetail = errorData.details || errorData.error || sessionResponse.statusText;
        throw new Error(`Failed to create session (${sessionResponse.status}): ${errorDetail}`);
      }

      console.log('[SignIn] Session cookie created successfully');

      // Session cookie is now set - use window.location for full page reload
      // This ensures server-side auth check picks up the new cookie
      setIsRedirecting(true);

      // Add a small delay to ensure cookie is fully committed
      await new Promise((resolve) => setTimeout(resolve, 100));

      window.location.href = '/feeds';
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
      console.error('Sign in error:', err);
      setError(errorMsg);
      setLoading(false);
      setIsRedirecting(false);
    }
  };

  // Show loading while checking auth state or redirecting
  if (authLoading || isRedirecting || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">{isRedirecting ? 'Redirecting...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Sign in to your account using Google</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button onClick={handleGoogleSignIn} className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
