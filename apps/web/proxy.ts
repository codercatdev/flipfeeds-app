import { type NextRequest, NextResponse } from 'next/server';

const FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:5001/flipfeeds-app/us-central1'
    : 'https://us-central1-flipfeeds-app.cloudfunctions.net');

export async function proxy(request: NextRequest) {
  // Handle CORS for MCP endpoints
  const isMcpEndpoint =
    request.nextUrl.pathname.startsWith('/mcp') ||
    request.nextUrl.pathname.startsWith('/.well-known') ||
    ['/register', '/authorize', '/login', '/auth-callback', '/token', '/revoke'].includes(
      request.nextUrl.pathname
    );

  if (isMcpEndpoint) {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, mcp-protocol-version, mcp-session-id',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Determine the backend function and path
      let backendFunction = 'mcpServer';
      let backendPath = '';

      if (request.nextUrl.pathname === '/mcp' || request.nextUrl.pathname.startsWith('/mcp/')) {
        // MCP Server endpoints
        backendFunction = 'mcpServer';
        backendPath =
          request.nextUrl.pathname === '/mcp' ? '' : request.nextUrl.pathname.substring(4);
      } else if (request.nextUrl.pathname === '/.well-known/oauth-protected-resource') {
        // OAuth protected resource metadata → mcpServer
        backendFunction = 'mcpServer';
        backendPath = '/.well-known/oauth-protected-resource';
      } else if (request.nextUrl.pathname === '/.well-known/oauth-authorization-server') {
        // OAuth authorization server metadata → mcpAuthServer
        backendFunction = 'mcpAuthServer';
        backendPath = '/.well-known/oauth-authorization-server';
      } else if (request.nextUrl.pathname === '/.well-known/openid-configuration') {
        // OpenID configuration → mcpAuthServer
        backendFunction = 'mcpAuthServer';
        backendPath = '/.well-known/openid-configuration';
      } else if (
        ['/register', '/authorize', '/login', '/auth-callback', '/token', '/revoke'].includes(
          request.nextUrl.pathname
        )
      ) {
        // Auth endpoints → mcpAuthServer
        backendFunction = 'mcpAuthServer';
        backendPath = request.nextUrl.pathname;
      } else {
        // Fallback for any other matched endpoints
        backendFunction = 'mcpAuthServer';
        backendPath = request.nextUrl.pathname;
      }

      // Get all headers from the incoming request
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });

      // Get the request body
      const body = request.body ? await request.text() : undefined;

      // Build the full URL with query parameters preserved
      const queryString = request.nextUrl.search; // Includes the leading '?'
      const fullBackendUrl = `${FUNCTIONS_URL}/${backendFunction}${backendPath}${queryString}`;

      // Forward to the appropriate backend function
      const response = await fetch(fullBackendUrl, {
        method: request.method,
        headers,
        body,
      });

      // Create response with CORS headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, mcp-protocol-version, mcp-session-id'
      );

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('MCP proxy error:', error);
      return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/mcp/:path*',
    '/.well-known/:path*',
    '/register',
    '/authorize',
    '/login',
    '/auth-callback',
    '/token',
    '/revoke',
  ],
};
