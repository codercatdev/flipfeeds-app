import * as crypto from 'node:crypto';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Config } from './config';

/**
 * Interface for access token payload
 */
export interface AccessTokenPayload extends JWTPayload {
    uid: string;
    email?: string;
    scope: string;
    token_type: 'access_token';
}

/**
 * Interface for refresh token payload
 */
export interface RefreshTokenPayload extends JWTPayload {
    uid: string;
    token_type: 'refresh_token';
    jti: string; // JWT ID for revocation
}

/**
 * Interface for authorization code data
 */
export interface AuthorizationCode {
    code: string;
    uid: string;
    email?: string;
    clientId: string;
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    scope: string;
    expiresAt: number;
}

/**
 * Interface for registered client
 */
export interface RegisteredClient {
    client_id: string;
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    created_at: number;
}

/**
 * Generate a secure JWT signing key from the secret
 */
export function getJwtSecret(secret: string): Uint8Array {
    return new TextEncoder().encode(secret);
}

/**
 * Generate an access token JWT
 */
export async function generateAccessToken(
    uid: string,
    email: string | undefined,
    scope: string,
    secret: string
): Promise<string> {
    const key = getJwtSecret(secret);

    const token = await new SignJWT({
        uid,
        email,
        scope,
        token_type: 'access_token',
    } as AccessTokenPayload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(OAuth2Config.ISSUER)
        .setExpirationTime(`${OAuth2Config.ACCESS_TOKEN_EXPIRY}s`)
        .setJti(uuidv4())
        .sign(key);

    return token;
}

/**
 * Generate a refresh token JWT
 */
export async function generateRefreshToken(uid: string, secret: string): Promise<string> {
    const key = getJwtSecret(secret);

    const token = await new SignJWT({
        uid,
        token_type: 'refresh_token',
        jti: uuidv4(),
    } as RefreshTokenPayload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(OAuth2Config.ISSUER)
        .setExpirationTime(`${OAuth2Config.REFRESH_TOKEN_EXPIRY}s`)
        .sign(key);

    return token;
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
    token: string,
    secret: string
): Promise<AccessTokenPayload> {
    const key = getJwtSecret(secret);

    const { payload } = await jwtVerify(token, key, {
        issuer: OAuth2Config.ISSUER,
    });

    if ((payload as AccessTokenPayload).token_type !== 'access_token') {
        throw new Error('Invalid token type');
    }

    return payload as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(
    token: string,
    secret: string
): Promise<RefreshTokenPayload> {
    const key = getJwtSecret(secret);

    const { payload } = await jwtVerify(token, key, {
        issuer: OAuth2Config.ISSUER,
    });

    if ((payload as RefreshTokenPayload).token_type !== 'refresh_token') {
        throw new Error('Invalid token type');
    }

    return payload as RefreshTokenPayload;
}

/**
 * Generate an authorization code
 */
export function generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a client ID
 */
export function generateClientId(): string {
    return uuidv4();
}

/**
 * Verify PKCE code challenge
 */
export function verifyCodeChallenge(
    codeVerifier: string,
    codeChallenge: string,
    method: string
): boolean {
    if (method !== 'S256') {
        return false;
    }

    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    return hash === codeChallenge;
}

/**
 * Validate redirect URI
 */
export function isValidRedirectUri(uri: string, registeredUris: string[]): boolean {
    return registeredUris.includes(uri);
}
