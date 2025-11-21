import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Check if we're using emulators
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

export async function POST(request: NextRequest) {
  console.log('[Session API] POST request received');

  try {
    // Lazy load admin to avoid initialization issues
    const { adminAuth } = await import('@/lib/firebase-admin');
    console.log('[Session API] Firebase Admin loaded');

    const body = await request.json();
    const { token } = body;
    console.log('[Session API] Received request with token:', token ? 'present' : 'missing');
    console.log('[Session API] Token length:', token?.length);
    console.log('[Session API] Emulator mode:', USE_EMULATORS);

    if (!token) {
      console.log('[Session API] Missing token');
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    if (USE_EMULATORS) {
      // In emulator mode, we can't verify the token with Firebase Admin due to missing "kid" claim
      // Instead, we'll just store the token directly and trust it (safe for development)
      console.log('[Session API] Emulator mode - storing token without verification');

      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: '__session',
        value: token, // Store the ID token directly
        httpOnly: true,
        secure: false, // Not needed in dev
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 5, // 5 days
        path: '/',
      });

      console.log('[Session API] Session cookie set (emulator mode)');
      return response;
    }

    // Production mode - verify and create session cookie
    console.log('[Session API] Verifying ID token...');
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true); // checkRevoked = true
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Session API] Verification with checkRevoked=true failed, trying without revocation check...'
        );
        decodedToken = await adminAuth.verifyIdToken(token, false);
      } else {
        throw e;
      }
    }
    console.log('[Session API] Token verified for user:', decodedToken.uid);

    // Create a proper session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    console.log('[Session API] Creating session cookie...');
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Session API] createSessionCookie failed, falling back to ID token as session cookie (Dev only)'
        );
        sessionCookie = token;
      } else {
        throw e;
      }
    }
    console.log('[Session API] Session cookie created/set, length:', sessionCookie.length);

    // Set the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: '__session',
      value: sessionCookie,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    console.log('[Session API] Session cookie set successfully');
    return response;
  } catch (error) {
    console.error('[Session API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the session cookie (works for both emulator and production)
    response.cookies.set({
      name: '__session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    console.log('[Session API] Cleared __session cookie');
    return response;
  } catch (error) {
    console.error('[Session API] Error clearing session:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
