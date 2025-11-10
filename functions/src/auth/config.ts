import { defineSecret } from 'firebase-functions/params';

/**
 * OAuth 2.1 Configuration for MCP Authorization Server
 */

// Secret for signing JWTs - this should be a secure random string
// In production, set this via: firebase functions:secrets:set JWT_SECRET
export const jwtSecret = defineSecret('JWT_SECRET');

// Configuration constants
export const OAuth2Config = {
    // Token expiry times (in seconds)
    ACCESS_TOKEN_EXPIRY: 3600, // 1 hour
    REFRESH_TOKEN_EXPIRY: 2592000, // 30 days
    AUTHORIZATION_CODE_EXPIRY: 600, // 10 minutes

    // JWT issuer
    ISSUER: 'flipfeeds-mcp-auth-server',

    // Supported grant types
    GRANT_TYPES: ['authorization_code', 'refresh_token'],

    // Supported response types
    RESPONSE_TYPES: ['code'],

    // Supported scopes
    SCOPES: ['mcp:access'],

    // Token endpoint auth methods
    TOKEN_ENDPOINT_AUTH_METHODS: ['none'], // Public clients (no client secret required)

    // Code challenge methods for PKCE
    CODE_CHALLENGE_METHODS: ['S256'],
} as const;

/**
 * Get the base URL for the hosting (for OAuth metadata URLs)
 * When running locally with hosting emulator, use hosting URL
 * In production, use the Firebase Hosting URL
 */
export function getHostingBaseUrl(): string {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // Local emulator - use hosting emulator URL
        return 'http://127.0.0.1:5002';
    }
    // Production - use your Firebase Hosting domain
    const projectId = process.env.GCLOUD_PROJECT || 'flipfeeds-app';
    return `https://${projectId}.web.app`;
}

/**
 * Get the base URL for the functions (direct access)
 * This will differ between emulator and production
 */
export function getBaseUrl(): string {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // Local emulator
        const projectId = process.env.GCLOUD_PROJECT || 'flipfeeds-app';
        return `http://localhost:5001/${projectId}/us-central1`;
    }
    // Production
    const region = process.env.FUNCTION_REGION || 'us-central1';
    const projectId = process.env.GCLOUD_PROJECT || 'flipfeeds-app';
    return `https://${region}-${projectId}.cloudfunctions.net`;
}

/**
 * Get the authorization server base URL
 * Uses hosting URL for OAuth endpoints (via rewrites)
 */
export function getAuthServerUrl(): string {
    return getHostingBaseUrl();
}

/**
 * Get the MCP server URL
 * Uses hosting URL for MCP endpoint (via rewrites)
 */
export function getMcpServerUrl(): string {
    return `${getHostingBaseUrl()}/mcp`;
}
