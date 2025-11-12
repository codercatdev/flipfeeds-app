/**
 * Custom Context Provider for FlipFeeds Authentication
 *
 * This module provides a context provider that extracts user authentication
 * information from either OAuth access tokens or Firebase ID tokens and
 * makes it available to Genkit flows via context.auth.
 *
 * Based on Genkit's context provider pattern:
 * https://genkit.dev/docs/deployment/authorization/#non-firebase-http-authorization
 */

import type { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { UserFacingError } from 'genkit';
import { jwtSecret } from './config';
import { verifyAccessToken } from './tokens';

/**
 * Authentication context structure that will be available in flows
 * via context.auth
 */
export interface FlipFeedsAuthContext {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
    [key: string]: any;
}

/**
 * Extract the Bearer token from the Authorization header
 */
function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.split('Bearer ')[1];
}

/**
 * Verify an OAuth access token and return auth context
 */
async function verifyOAuthToken(token: string): Promise<FlipFeedsAuthContext | null> {
    const secret = jwtSecret.value();
    if (!secret) {
        return null; // OAuth not configured
    }

    try {
        const payload = await verifyAccessToken(token, secret);
        console.log('✓ Authenticated via OAuth access token');
        return payload;
    } catch (_error) {
        console.log('✗ Not a valid OAuth token');
        return null;
    }
}

/**
 * Verify a Firebase ID token and return auth context
 */
async function verifyFirebaseToken(token: string): Promise<FlipFeedsAuthContext | null> {
    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        console.log('✓ Authenticated via Firebase ID token');
        return decodedToken;
    } catch (error) {
        console.error('✗ Firebase token verification failed:', error);
        return null;
    }
}

/**
 * Authenticate a request and return auth context
 *
 * Supports dual authentication modes:
 * 1. OAuth 2.1 access tokens (from mcpAuthServer)
 * 2. Firebase ID tokens (from mobile app or direct access)
 *
 * This function is used in the MCP server to authenticate requests
 * and populate the Genkit context with auth information.
 */
export async function authenticateRequest(req: Request): Promise<FlipFeedsAuthContext> {
    // Extract token from request
    const token = extractBearerToken(req);

    if (!token) {
        throw new UserFacingError('UNAUTHENTICATED', 'Missing or invalid authorization header');
    }

    // Try OAuth token first (if configured)
    let authContext = await verifyOAuthToken(token);

    // Fall back to Firebase ID token
    if (!authContext) {
        authContext = await verifyFirebaseToken(token);
    }

    if (!authContext) {
        throw new UserFacingError('UNAUTHENTICATED', 'Invalid or expired token');
    }

    console.log('Auth context established:', {
        uid: authContext.uid,
        email: authContext.email,
    });

    return authContext;
}

/**
 * Authorization policy helper: require authenticated user
 */
export const requireAuth = (context: { auth?: FlipFeedsAuthContext }) => {
    if (!context.auth?.uid) {
        throw new UserFacingError('UNAUTHENTICATED', 'Authentication required');
    }
    return context.auth;
};

/**
 * Authorization policy helper: require specific user
 */
export const requireUser = (expectedUid: string) => (context: { auth?: FlipFeedsAuthContext }) => {
    const auth = requireAuth(context);
    if (auth.uid !== expectedUid) {
        throw new UserFacingError(
            'PERMISSION_DENIED',
            'You do not have permission to access this resource'
        );
    }
    return auth;
};
