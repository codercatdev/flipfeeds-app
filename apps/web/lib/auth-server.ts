import type { DecodedIdToken } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Check if we're using emulators
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

/**
 * Get the currently authenticated user from the session cookie (server-side)
 * Returns null if not authenticated or token is invalid
 *
 * In emulator mode, the session cookie contains an ID token (not a session cookie)
 * In production mode, the session cookie contains a proper Firebase session cookie
 */
export async function getServerAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    console.log('[Auth Server] Getting server auth, cookie present:', !!sessionCookie);

    if (!sessionCookie) {
      console.log('[Auth Server] No session cookie found');
      return null;
    }

    console.log('[Auth Server] Verifying session cookie/token...');
    console.log('[Auth Server] Emulator mode:', USE_EMULATORS);

    if (USE_EMULATORS) {
      // In emulator mode, the cookie contains an unverified ID token
      // We'll decode it without verification (safe for development)
      console.log('[Auth Server] Emulator mode - decoding token without verification');

      // Decode the JWT payload (middle part of the token)
      const parts = sessionCookie.split('.');
      if (parts.length !== 3) {
        console.error('[Auth Server] Invalid token format');
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('[Auth Server] Token decoded for user:', payload.sub || payload.user_id);

      // In emulator mode, return user data from the token payload
      // The emulator tokens include all necessary user info
      return {
        uid: payload.sub || payload.user_id,
        email: payload.email || null,
        displayName: payload.name || null,
        photoURL: payload.picture || null,
      };
    }

    // Production mode - verify the session cookie
    console.log('[Auth Server] Production mode - verifying session cookie');
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
      // If session cookie verification fails, try verifying as ID token
      // This handles the case where we fell back to ID token in route.ts (e.g. local dev without service account)
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Auth Server] Session cookie verification failed, trying as ID token (Dev fallback)...'
        );
        try {
          decodedToken = await adminAuth.verifyIdToken(sessionCookie);
          console.log('[Auth Server] ID token verified successfully (Dev fallback)');
        } catch (_innerError) {
          // If both fail, throw the original error
          throw error;
        }
      } else {
        throw error;
      }
    }
    console.log('[Auth Server] Token verified for user:', decodedToken.uid);

    // Get full user details
    try {
      const user = await adminAuth.getUser(decodedToken.uid);
      return {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
      };
    } catch (error) {
      console.warn(
        '[Auth Server] Failed to fetch user details from Admin SDK, falling back to token claims:',
        error
      );
      // Fallback to token claims if Admin SDK fails (e.g. permission denied in local dev)
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        displayName: (decodedToken.name as string) || null,
        photoURL: (decodedToken.picture as string) || null,
      };
    }
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
