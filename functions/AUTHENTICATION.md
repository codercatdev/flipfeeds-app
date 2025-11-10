# MCP Server Authentication Guide

This MCP server supports **dual authentication modes** to provide flexibility for different client types.

## Metadata Discovery Endpoints

The server exposes OAuth metadata endpoints for automatic discovery by MCP clients:

### Authorization Server Metadata
**Endpoint:** `/.well-known/oauth-authorization-server`  
**Function:** `mcpAuthServer`  
**Spec:** [RFC 8414 - OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)

This endpoint describes the OAuth authorization server capabilities and endpoints. MCP clients use this to discover:
- Authorization endpoint
- Token endpoint  
- Registration endpoint
- Revocation endpoint
- Supported grant types, scopes, and PKCE methods

**Example:**
```bash
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/.well-known/oauth-authorization-server
```

**Response:**
```json
{
  "issuer": "https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer",
  "authorization_endpoint": "https://.../mcpAuthServer/authorize",
  "token_endpoint": "https://.../mcpAuthServer/token",
  "registration_endpoint": "https://.../mcpAuthServer/register",
  "revocation_endpoint": "https://.../mcpAuthServer/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["none"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:access"]
}
```

### Protected Resource Metadata
**Endpoint:** `/.well-known/oauth-protected-resource`  
**Function:** `mcpProtectedResource`  
**Spec:** [RFC 9728 - OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)

This endpoint describes the protected resource (MCP server) and its authorization requirements. Required by the MCP specification.

**Example:**
```bash
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpProtectedResource/.well-known/oauth-protected-resource
```

**Response:**
```json
{
  "resource": "https://us-central1-flipfeeds-app.cloudfunctions.net/mcpServer",
  "authorization_servers": ["https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer"],
  "scopes_supported": ["openid", "profile", "email"],
  "bearer_methods_supported": ["header"],
  "resource_signing_alg_values_supported": ["RS256"],
  "resource_documentation": "https://.../mcpServer/docs",
  "resource_policy_uri": "https://.../mcpServer/policy"
}
```

### CORS Support
Both metadata endpoints include CORS support for browser-based MCP clients via `OPTIONS` handlers:
```bash
curl -X OPTIONS https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/.well-known/oauth-authorization-server
```

## Authentication Methods

### 1. Firebase ID Token (Direct Access)
**Best for:** Mobile apps, web apps, and internal tools that already use Firebase Authentication.

**How it works:**
1. User signs in with Firebase Authentication (Google, Email, etc.)
2. App gets the Firebase ID token: `await user.getIdToken()`
3. App sends requests with the ID token in the `Authorization` header

**Example:**
```bash
curl -X POST https://us-central1-flipfeeds-app.cloudfunctions.net/mcpServer \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**Advantages:**
- ✅ Simple and direct
- ✅ No additional OAuth flow needed
- ✅ Works with existing Firebase auth
- ✅ Perfect for your FlipFeeds mobile app

### 2. OAuth 2.1 Access Token (Standard MCP Flow)
**Best for:** Standard MCP clients like Claude Desktop, VSCode extensions, or any third-party client.

**How it works:**
1. Client discovers authorization server via metadata endpoint
2. Client registers itself with the auth server
3. User is redirected to Firebase sign-in page
4. After sign-in, client exchanges authorization code for access token
5. Client uses access token for all subsequent requests

**Example Flow:**
```bash
# 1. Discover metadata
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/.well-known/mcp-authorization-server

# 2. Register client
curl -X POST https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["http://localhost:3000/callback"]
  }'

# 3. User authorizes (via browser redirect)
# 4. Exchange code for token
curl -X POST https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "<AUTH_CODE>",
    "redirect_uri": "http://localhost:3000/callback",
    "client_id": "<CLIENT_ID>",
    "code_verifier": "<CODE_VERIFIER>"
  }'

# 5. Use access token
curl -X POST https://us-central1-flipfeeds-app.cloudfunctions.net/mcpServer \
  -H "Authorization: Bearer <OAUTH_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**Advantages:**
- ✅ Standard OAuth 2.1 compliant
- ✅ Works with any MCP client
- ✅ Supports PKCE for security
- ✅ Token refresh capability

## How the Server Chooses

The server automatically detects which token type you're using:

1. **First**, it tries to verify as an OAuth access token (if JWT_SECRET is configured)
2. **If that fails**, it falls back to Firebase ID token verification
3. **If both fail**, it returns a 401 Unauthorized error

This means:
- Your existing mobile app continues to work without changes
- Standard MCP clients can use the OAuth flow
- No configuration needed on the client side

## Setup Requirements

### For Firebase ID Token Auth (Already Working)
- ✅ No additional setup needed
- ✅ Works with your existing Firebase configuration

### For OAuth 2.1 Auth (New)
You need to set the JWT secret:

```bash
# Set the JWT secret (one-time setup)
firebase functions:secrets:set JWT_SECRET

# When prompted, enter a secure random string (e.g., generate with)
openssl rand -base64 32
```

## Migration Path

**Current setup (Firebase ID tokens only):**
- Your app works as-is
- No changes needed

**Adding OAuth support:**
1. Set the JWT_SECRET via `firebase functions:secrets:set JWT_SECRET`
2. Deploy the new functions
3. OAuth clients can now connect
4. Your existing app continues working unchanged

## Which Should You Use?

| Client Type | Recommended Auth | Why |
|------------|------------------|-----|
| FlipFeeds Mobile App | Firebase ID Token | Already integrated, simpler |
| Internal Tools | Firebase ID Token | Direct access, less overhead |
| Claude Desktop | OAuth 2.1 | Standard MCP protocol |
| VSCode Extension | OAuth 2.1 | Standard MCP protocol |
| Third-party Clients | OAuth 2.1 | Universal compatibility |

## Security Notes

- Firebase ID tokens expire after 1 hour (auto-refreshed by Firebase SDK)
- OAuth access tokens expire after 1 hour (use refresh token to get new one)
- OAuth refresh tokens expire after 30 days
- Both methods are equally secure
- PKCE is required for OAuth flow (prevents authorization code interception)
