# MCP Metadata Discovery Endpoints - Summary

## Overview
The FlipFeeds MCP server provides complete OAuth 2.0/2.1 metadata discovery endpoints as required by the MCP specification.

## Deployed Functions

### 1. **mcpServer** - Main MCP Server
- **Path:** `/mcpServer`
- **Purpose:** Handles MCP protocol requests (tools, resources, prompts)
- **Authentication:** Dual mode (OAuth access tokens OR Firebase ID tokens)
- **Transport:** Streamable HTTP
- **Metadata Endpoint:**
  - `/.well-known/oauth-protected-resource` (RFC 9728) - **Lives on mcpServer itself**

### 2. **mcpAuthServer** - OAuth Authorization Server
- **Path:** `/mcpAuthServer`
- **Purpose:** Handles OAuth 2.1 flow (registration, authorization, token exchange)
- **Metadata Endpoints:**
  - `/.well-known/oauth-authorization-server` (RFC 8414)
  - `/.well-known/mcp-authorization-server` (MCP-specific)
- **CORS:** Enabled for browser clients

### 3. **mcpProtectedResource** - Protected Resource Metadata (Standalone)
- **Path:** `/mcpProtectedResource`
- **Purpose:** **Alternative** standalone endpoint for protected resource metadata
- **Note:** ⚠️ **Not needed if using mcpServer/.well-known endpoint**
- **Metadata Endpoint:**
  - `/.well-known/oauth-protected-resource` (RFC 9728)
- **CORS:** Enabled for browser clients

## Complete Metadata Discovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client                                │
│                     (Claude, VSCode, etc.)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 1. Discover protected resource
                 ├──────────────────────────────────────────────┐
                 │                                              │
                 v                                              v
┌────────────────────────────────────┐    ┌──────────────────────────────────┐
│  mcpProtectedResource              │    │  mcpAuthServer                   │
│  /.well-known/                     │    │  /.well-known/                   │
│    oauth-protected-resource        │    │    oauth-authorization-server    │
├────────────────────────────────────┤    ├──────────────────────────────────┤
│ Returns:                           │    │ Returns:                         │
│ • Resource URL (mcpServer)         │    │ • Authorization endpoint         │
│ • Authorization server URL ────────┼────▶ • Token endpoint                 │
│ • Supported scopes                 │    │ • Registration endpoint          │
│ • Bearer methods                   │    │ • Revocation endpoint            │
└────────────────────────────────────┘    │ • Grant types                    │
                                          │ • PKCE methods                   │
                                          └──────────────┬───────────────────┘
                                                         │
                 ┌───────────────────────────────────────┘
                 │ 2. Register client
                 │ 3. Get authorization code (via Firebase UI)
                 │ 4. Exchange code for tokens
                 v
         ┌───────────────────┐
         │   mcpAuthServer   │
         │   /register       │
         │   /authorize      │
         │   /token          │
         │   /revoke         │
         └────────┬──────────┘
                  │
                  │ 5. Use access token
                  v
         ┌───────────────────┐
         │    mcpServer      │
         │    /mcp           │
         │  (MCP protocol)   │
         └───────────────────┘
```

## Testing Metadata Endpoints

### Quick Test (Use the script)
```bash
cd functions
./test-metadata.sh
```

### Local (Emulator)
```bash
# Protected Resource Metadata (on mcpServer - RECOMMENDED)
curl http://localhost:5001/flipfeeds-app/us-central1/mcpServer/.well-known/oauth-protected-resource

# Authorization Server Metadata
curl http://localhost:5001/flipfeeds-app/us-central1/mcpAuthServer/.well-known/oauth-authorization-server

# MCP-specific metadata
curl http://localhost:5001/flipfeeds-app/us-central1/mcpAuthServer/.well-known/mcp-authorization-server

# Alternative: Standalone protected resource metadata (not needed)
curl http://localhost:5001/flipfeeds-app/us-central1/mcpProtectedResource/.well-known/oauth-protected-resource
```

### Production
```bash
# Protected Resource Metadata (on mcpServer - RECOMMENDED)
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpServer/.well-known/oauth-protected-resource

# Authorization Server Metadata
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/.well-known/oauth-authorization-server

# MCP-specific metadata
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpAuthServer/.well-known/mcp-authorization-server

# Alternative: Standalone protected resource metadata (not needed)
curl https://us-central1-flipfeeds-app.cloudfunctions.net/mcpProtectedResource/.well-known/oauth-protected-resource
```

## Compliance

✅ **RFC 8414** - OAuth 2.0 Authorization Server Metadata  
✅ **RFC 9728** - OAuth 2.0 Protected Resource Metadata  
✅ **RFC 7591** - OAuth 2.0 Dynamic Client Registration  
✅ **RFC 6749** - OAuth 2.0 Authorization Framework  
✅ **RFC 7636** - PKCE (Proof Key for Code Exchange)  
✅ **MCP Specification** - Model Context Protocol (latest)

## Key Features

- ✅ **Dynamic Client Registration** - Clients can self-register
- ✅ **PKCE Support** - S256 code challenge method
- ✅ **CORS Enabled** - Browser-based clients supported
- ✅ **Dual Authentication** - OAuth OR Firebase ID tokens
- ✅ **Token Refresh** - Long-lived sessions via refresh tokens
- ✅ **Token Revocation** - Explicit token invalidation
- ✅ **Metadata Discovery** - Full OAuth autodiscovery

## Client Integration

Standard MCP clients (like Claude Desktop or VSCode MCP extension) only need the **MCP server URL**:

```
http://127.0.0.1:5001/flipfeeds-app/us-central1/mcpServer/mcp
```

Or in production:

```
https://us-central1-flipfeeds-app.cloudfunctions.net/mcpServer/mcp
```

The client will:
1. Access the MCP server at `/mcp`
2. Discover metadata at `/.well-known/oauth-protected-resource` (same server)
3. Find the authorization server URL from the metadata
4. Fetch authorization server metadata from the auth server
5. Register itself
6. Complete OAuth flow
7. Access MCP server with tokens

## Next Steps

1. **Deploy Functions**
   ```bash
   npm run deploy
   ```

2. **Set JWT Secret** (for OAuth support)
   ```bash
   firebase functions:secrets:set JWT_SECRET
   # Enter a secure random string (e.g., from: openssl rand -base64 32)
   ```

3. **Test OAuth Flow**
   - Use MCP Inspector or Claude Desktop
   - Point to the protected resource URL
   - Complete the OAuth flow

4. **Monitor Logs**
   ```bash
   firebase functions:log
   ```
