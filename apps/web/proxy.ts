import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === '/signin';

  // Check for Firebase session token in cookies
  const token = request.cookies.get('__session')?.value;

  // If trying to access protected route without token, redirect to signin
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // If logged in and trying to access signin, redirect to home
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
