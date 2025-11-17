import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    console.log('[Session API] Received request with token:', token ? 'present' : 'missing');

    if (!token) {
      console.log('[Session API] Missing token');
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Verify the ID token first
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('[Session API] Token verified for user:', decodedToken.uid);

    // Create a session cookie (5 days expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    // Create response with session cookie
    const response = NextResponse.json({ success: true });

    // Set the session cookie (Firebase recommends using __session for Firebase Hosting)
    response.cookies.set({
      name: '__session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    console.log('[Session API] Session cookie created and set');
    return response;
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the session cookie
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
