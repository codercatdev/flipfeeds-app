import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Get the currently authenticated user from the session cookie (server-side)
 * Returns null if not authenticated or token is invalid
 */
export async function getServerAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // Verify the session cookie (not an ID token)
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Get full user details
    const user = await adminAuth.getUser(decodedToken.uid);

    return {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
    };
  } catch (error) {
    // Token is invalid or expired
    console.error('[Auth Server] Error verifying session:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in Server Components that require auth
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerAuth();

  if (!user) {
    throw new Error('Unauthorized - authentication required');
  }

  return user;
}
