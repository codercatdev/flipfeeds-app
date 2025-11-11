import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';
import { getAuthServerUrl, jwtSecret, OAuth2Config } from './config';
import {
    consumeAuthorizationCode,
    getClient,
    isTokenRevoked,
    revokeToken,
    storeAuthorizationCode,
    storeClient,
} from './storage';
import {
    type AuthorizationCode as AuthCodeData,
    generateAccessToken,
    generateAuthorizationCode,
    generateClientId,
    generateRefreshToken,
    isValidRedirectUri,
    type RegisteredClient,
    verifyCodeChallenge,
    verifyRefreshToken,
} from './tokens';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// METADATA ENDPOINT
// ============================================================================

/**
 * OAuth 2.1 Authorization Server Metadata
 * https://datatracker.ietf.org/doc/html/rfc8414
 */
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
    const baseUrl = getAuthServerUrl();

    res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        registration_endpoint: `${baseUrl}/register`,
        revocation_endpoint: `${baseUrl}/revoke`,
        response_types_supported: OAuth2Config.RESPONSE_TYPES,
        grant_types_supported: OAuth2Config.GRANT_TYPES,
        token_endpoint_auth_methods_supported: OAuth2Config.TOKEN_ENDPOINT_AUTH_METHODS,
        code_challenge_methods_supported: OAuth2Config.CODE_CHALLENGE_METHODS,
        scopes_supported: OAuth2Config.SCOPES,
    });
});

/**
 * CORS preflight handler for OAuth authorization server metadata
 * Required for browser-based MCP clients
 */
app.options('/.well-known/oauth-authorization-server', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
});

/**
 * MCP-specific metadata endpoint
 */
app.get('/.well-known/mcp-authorization-server', (_req, res) => {
    const baseUrl = getAuthServerUrl();

    res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        registration_endpoint: `${baseUrl}/register`,
        revocation_endpoint: `${baseUrl}/revoke`,
        grant_types_supported: OAuth2Config.GRANT_TYPES,
        code_challenge_methods_supported: OAuth2Config.CODE_CHALLENGE_METHODS,
    });
});

/**
 * OpenID Configuration endpoint (alias for oauth-authorization-server)
 * Some OAuth clients look for this endpoint
 */
app.get('/.well-known/openid-configuration', (_req, res) => {
    const baseUrl = getAuthServerUrl();

    res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
        registration_endpoint: `${baseUrl}/register`,
        revocation_endpoint: `${baseUrl}/revoke`,
        response_types_supported: OAuth2Config.RESPONSE_TYPES,
        grant_types_supported: OAuth2Config.GRANT_TYPES,
        token_endpoint_auth_methods_supported: OAuth2Config.TOKEN_ENDPOINT_AUTH_METHODS,
        code_challenge_methods_supported: OAuth2Config.CODE_CHALLENGE_METHODS,
        scopes_supported: OAuth2Config.SCOPES,
    });
});

/**
 * CORS preflight handler for OpenID configuration
 */
app.options('/.well-known/openid-configuration', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
});

// ============================================================================
// CLIENT REGISTRATION ENDPOINT
// ============================================================================

/**
 * Dynamic Client Registration
 * https://datatracker.ietf.org/doc/html/rfc7591
 */
app.post('/register', async (req, res) => {
    try {
        const { client_name, redirect_uris } = req.body;

        if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'client_name and redirect_uris are required',
            });
        }

        const clientId = generateClientId();

        const client: RegisteredClient = {
            client_id: clientId,
            client_name,
            redirect_uris,
            grant_types: [...OAuth2Config.GRANT_TYPES],
            response_types: [...OAuth2Config.RESPONSE_TYPES],
            token_endpoint_auth_method: 'none',
            created_at: Date.now(),
        };

        await storeClient(client);

        return res.status(201).json({
            client_id: client.client_id,
            client_name: client.client_name,
            redirect_uris: client.redirect_uris,
            grant_types: client.grant_types,
            response_types: client.response_types,
            token_endpoint_auth_method: client.token_endpoint_auth_method,
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            error: 'server_error',
            error_description: 'Failed to register client',
        });
    }
});

// ============================================================================
// AUTHORIZATION ENDPOINT
// ============================================================================

/**
 * Authorization Endpoint - initiates the OAuth flow
 */
app.get('/authorize', async (req, res) => {
    const {
        client_id,
        redirect_uri,
        response_type,
        state,
        code_challenge,
        code_challenge_method,
        scope = 'mcp:access',
    } = req.query as Record<string, string>;

    // Validate required parameters
    if (!client_id || !redirect_uri || !response_type) {
        return res
            .status(400)
            .send('Missing required parameters: client_id, redirect_uri, or response_type');
    }

    if (response_type !== 'code') {
        return res.status(400).send('Unsupported response_type. Only "code" is supported.');
    }

    // Validate client
    const client = await getClient(client_id);
    if (!client) {
        return res.status(400).send('Invalid client_id');
    }

    // Validate redirect URI
    if (!isValidRedirectUri(redirect_uri, client.redirect_uris)) {
        return res.status(400).send('Invalid redirect_uri');
    }

    // PKCE is required
    if (!code_challenge || !code_challenge_method) {
        return res
            .status(400)
            .send('PKCE is required: code_challenge and code_challenge_method must be provided');
    }

    if (code_challenge_method !== 'S256') {
        return res.status(400).send('Only S256 code_challenge_method is supported');
    }

    // Store authorization request in session/state
    // For now, pass parameters to the login page
    const loginUrl = `${getAuthServerUrl()}/login?${new URLSearchParams({
        client_id,
        redirect_uri,
        state: state || '',
        code_challenge,
        code_challenge_method,
        scope,
    }).toString()}`;

    return res.redirect(loginUrl);
});

/**
 * Login page endpoint - serves the Firebase authentication UI
 */
app.get('/login', (req, res) => {
    const params = req.query as Record<string, string>;

    // This will serve an HTML page with FirebaseUI
    // The HTML page will be created separately
    res.send(getLoginPageHtml(params));
});

/**
 * Callback endpoint after Firebase authentication
 */
app.post('/auth-callback', async (req, res) => {
    try {
        const {
            firebase_id_token,
            client_id,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method,
            scope,
        } = req.body;

        if (!firebase_id_token) {
            return res.status(400).json({ error: 'Missing firebase_id_token' });
        }

        // Verify the Firebase ID token
        const decodedToken = await getAuth().verifyIdToken(firebase_id_token);

        // Generate authorization code
        const code = generateAuthorizationCode();

        const authCode: AuthCodeData = {
            code,
            uid: decodedToken.uid,
            email: decodedToken.email,
            clientId: client_id,
            redirectUri: redirect_uri,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method,
            scope: scope || 'mcp:access',
            expiresAt: Date.now() + OAuth2Config.AUTHORIZATION_CODE_EXPIRY * 1000,
        };

        await storeAuthorizationCode(authCode);

        // Build redirect URL with code
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', code);
        if (state) {
            redirectUrl.searchParams.set('state', state);
        }

        return res.json({ redirect_url: redirectUrl.toString() });
    } catch (error) {
        console.error('Auth callback error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
});

// ============================================================================
// TOKEN ENDPOINT
// ============================================================================

/**
 * Token Endpoint - exchanges authorization code for access token
 */
app.post('/token', async (req, res) => {
    try {
        const { grant_type, code, redirect_uri, client_id, code_verifier, refresh_token } =
            req.body;

        if (!grant_type) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'grant_type is required',
            });
        }

        const secret = jwtSecret.value();
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        if (grant_type === 'authorization_code') {
            // Validate required parameters
            if (!code || !redirect_uri || !client_id || !code_verifier) {
                return res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'Missing required parameters',
                });
            }

            // Consume the authorization code
            const authCode = await consumeAuthorizationCode(code);

            if (!authCode) {
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Invalid or expired authorization code',
                });
            }

            // Validate client_id and redirect_uri
            if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Invalid client_id or redirect_uri',
                });
            }

            // Verify PKCE code verifier
            if (authCode.codeChallenge && authCode.codeChallengeMethod) {
                if (
                    !verifyCodeChallenge(
                        code_verifier,
                        authCode.codeChallenge,
                        authCode.codeChallengeMethod
                    )
                ) {
                    return res.status(400).json({
                        error: 'invalid_grant',
                        error_description: 'Invalid code_verifier',
                    });
                }
            }

            // Generate tokens
            const accessToken = await generateAccessToken(
                authCode.uid,
                authCode.email,
                authCode.scope,
                secret
            );

            const refreshToken = await generateRefreshToken(authCode.uid, secret);

            return res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: OAuth2Config.ACCESS_TOKEN_EXPIRY,
                refresh_token: refreshToken,
                scope: authCode.scope,
            });
        } else if (grant_type === 'refresh_token') {
            if (!refresh_token) {
                return res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'refresh_token is required',
                });
            }

            // Verify refresh token
            const payload = await verifyRefreshToken(refresh_token, secret);

            // Check if token is revoked
            if (payload.jti && (await isTokenRevoked(payload.jti))) {
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Token has been revoked',
                });
            }

            // Generate new access token
            const accessToken = await generateAccessToken(
                payload.uid,
                undefined,
                'mcp:access',
                secret
            );

            return res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: OAuth2Config.ACCESS_TOKEN_EXPIRY,
                scope: 'mcp:access',
            });
        } else {
            return res.status(400).json({
                error: 'unsupported_grant_type',
                error_description: `Grant type ${grant_type} is not supported`,
            });
        }
    } catch (error) {
        console.error('Token endpoint error:', error);
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: error instanceof Error ? error.message : 'Token generation failed',
        });
    }
});

// ============================================================================
// REVOCATION ENDPOINT
// ============================================================================

/**
 * Token Revocation Endpoint
 */
app.post('/revoke', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'token is required',
            });
        }

        const secret = jwtSecret.value();
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        try {
            // Try to verify as refresh token
            const payload = await verifyRefreshToken(token, secret);
            if (payload.jti && payload.exp) {
                await revokeToken(payload.jti, payload.exp * 1000);
            }
        } catch (_error) {
            // Token might be invalid or already expired, which is fine
            console.log('Token revocation attempted for invalid/expired token');
        }

        // Always return 200 per spec
        return res.status(200).send();
    } catch (error) {
        console.error('Revocation error:', error);
        return res.status(200).send(); // Still return 200 per spec
    }
});

// ============================================================================
// HTML PAGE FOR FIREBASE AUTH
// ============================================================================

function getLoginPageHtml(params: Record<string, string>): string {
    const authServerUrl = getAuthServerUrl();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign In - FlipFeeds MCP</title>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.js"></script>
  <link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.css" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }
    h1 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.5rem;
    }
    .subtitle {
      color: #666;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Sign In to FlipFeeds MCP</h1>
    <p class="subtitle">Authenticate to grant access to your MCP client</p>
    <div id="firebaseui-auth-container"></div>
    <div id="loader" style="display:none;">Signing in...</div>
  </div>
  
  <script>
    // Firebase configuration for web
const firebaseConfig = {
  apiKey: "AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0",
  authDomain: "flipfeeds-app.firebaseapp.com",
  databaseURL: "https://flipfeeds-app-default-rtdb.firebaseio.com",
  projectId: "flipfeeds-app",
  storageBucket: "flipfeeds-app.firebasestorage.app",
  messagingSenderId: "361402949529",
  appId: "1:361402949529:web:25b7fc17fde9148cef3d08"
};
    
    firebase.initializeApp(firebaseConfig);
    
    const ui = new firebaseui.auth.AuthUI(firebase.auth());
    
    const uiConfig = {
      callbacks: {
        signInSuccessWithAuthResult: function(authResult) {
          // Get the Firebase ID token
          authResult.user.getIdToken().then(function(idToken) {
            // Send the ID token to our auth callback
            fetch('${authServerUrl}/auth-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firebase_id_token: idToken,
                client_id: '${params.client_id}',
                redirect_uri: '${params.redirect_uri}',
                state: '${params.state}',
                code_challenge: '${params.code_challenge}',
                code_challenge_method: '${params.code_challenge_method}',
                scope: '${params.scope}'
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.redirect_url) {
                window.location.href = data.redirect_url;
              } else {
                alert('Authentication failed');
              }
            })
            .catch(err => {
              console.error('Error:', err);
              alert('Authentication failed');
            });
          });
          return false;
        }
      },
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
      ],
      signInFlow: 'popup',
      tosUrl: 'https://flipfeeds.app/terms',
      privacyPolicyUrl: 'https://flipfeeds.app/privacy'
    };
    
    ui.start('#firebaseui-auth-container', uiConfig);
  </script>
</body>
</html>
  `;
}

// ============================================================================
// EXPORT
// ============================================================================

export const mcpAuthServer = onRequest(
    {
        cors: true,
        secrets: [jwtSecret],
    },
    app
);
