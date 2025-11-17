import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { getAuthServerUrl, getMcpServerUrl } from './config';

const app = express();

// ============================================================================
// PROTECTED RESOURCE METADATA ENDPOINT
// ============================================================================

/**
 * OAuth 2.0 Protected Resource Metadata
 * https://datatracker.ietf.org/doc/html/rfc9728#section-4.1
 *
 * This endpoint describes the protected resource (MCP server) and its
 * authorization requirements. Required by MCP specification.
 */
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  const mcpServerUrl = getMcpServerUrl();
  const authServerUrl = getAuthServerUrl();

  res.json({
    resource: mcpServerUrl,
    authorization_servers: [authServerUrl],
    scopes_supported: ['openid', 'profile', 'email'],
    bearer_methods_supported: ['header'],
    resource_signing_alg_values_supported: ['RS256'],
    resource_documentation: `${mcpServerUrl}/docs`,
    resource_policy_uri: `${mcpServerUrl}/policy`,
  });
});

/**
 * CORS preflight handler for OAuth metadata endpoints
 * Required for browser-based MCP clients
 */
app.options('/.well-known/oauth-protected-resource', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).send();
});

// Export as Firebase Function
export const mcpProtectedResource = onRequest({ cors: true }, app);
