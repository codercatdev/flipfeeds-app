import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();
        console.log(
            '[Session API] Received request with idToken:',
            idToken ? 'present' : 'missing'
        );

        if (!idToken) {
            console.log('[Session API] Missing idToken');
            return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
        }

        // Create response with session cookie
        const response = NextResponse.json({ success: true });

        // Set the session cookie (Firebase recommends using __session for Firebase Hosting)
        response.cookies.set({
            name: '__session',
            value: idToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        console.log('[Session API] Set __session cookie');
        return response;
    } catch (error) {
        console.error('[Session API] Error:', error);
        return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
    }
}
