import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = pathname === '/signin'

  const cookie = request.cookies.get('firebaseIdToken')
  const isLoggedIn = cookie?.value

  if (isPublicPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isPublicPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
