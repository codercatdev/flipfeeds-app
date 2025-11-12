import { getFirestore } from 'firebase-admin/firestore';
import type { AuthorizationCode, RegisteredClient } from './tokens';

const CLIENTS_COLLECTION = 'oauth_clients';
const AUTH_CODES_COLLECTION = 'oauth_authorization_codes';
const REVOKED_TOKENS_COLLECTION = 'oauth_revoked_tokens';

/**
 * Store a registered client
 */
export async function storeClient(client: RegisteredClient): Promise<void> {
    const db = getFirestore();
    await db.collection(CLIENTS_COLLECTION).doc(client.client_id).set(client);
}

/**
 * Get a registered client by ID
 */
export async function getClient(clientId: string): Promise<RegisteredClient | null> {
    const db = getFirestore();
    const doc = await db.collection(CLIENTS_COLLECTION).doc(clientId).get();

    if (!doc.exists) {
        return null;
    }

    return doc.data() as RegisteredClient;
}

/**
 * Remove undefined values from an object recursively
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
            continue;
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const cleaned = removeUndefined(value as Record<string, unknown>);
            if (Object.keys(cleaned).length > 0) {
                result[key] = cleaned;
            }
        } else if (Array.isArray(value)) {
            const cleaned = value.map((item) =>
                item && typeof item === 'object'
                    ? removeUndefined(item as Record<string, unknown>)
                    : item
            );
            result[key] = cleaned;
        } else {
            result[key] = value;
        }
    }

    return result as Partial<T>;
}

/**
 * Store an authorization code
 */
export async function storeAuthorizationCode(authCode: AuthorizationCode): Promise<void> {
    const db = getFirestore();
    // Remove undefined values to comply with Firestore requirements
    const cleanedAuthCode = removeUndefined(authCode as unknown as Record<string, unknown>);
    await db.collection(AUTH_CODES_COLLECTION).doc(authCode.code).set(cleanedAuthCode);
}

/**
 * Get and delete an authorization code (one-time use)
 */
export async function consumeAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const db = getFirestore();
    const docRef = db.collection(AUTH_CODES_COLLECTION).doc(code);

    return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
            return null;
        }

        const authCode = doc.data() as AuthorizationCode;

        // Check if expired
        if (Date.now() > authCode.expiresAt) {
            transaction.delete(docRef);
            return null;
        }

        // Delete after retrieval (one-time use)
        transaction.delete(docRef);

        return authCode;
    });
}

/**
 * Revoke a token by its JTI
 */
export async function revokeToken(jti: string, expiresAt: number): Promise<void> {
    const db = getFirestore();
    await db.collection(REVOKED_TOKENS_COLLECTION).doc(jti).set({
        revoked_at: Date.now(),
        expires_at: expiresAt,
    });
}

/**
 * Check if a token is revoked
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
    const db = getFirestore();
    const doc = await db.collection(REVOKED_TOKENS_COLLECTION).doc(jti).get();
    return doc.exists;
}

/**
 * Clean up expired authorization codes and revoked tokens
 * This should be run periodically (e.g., via a scheduled function)
 */
export async function cleanupExpiredData(): Promise<void> {
    const db = getFirestore();
    const now = Date.now();

    // Clean up expired auth codes
    const expiredCodes = await db
        .collection(AUTH_CODES_COLLECTION)
        .where('expiresAt', '<', now)
        .get();

    const batch = db.batch();
    expiredCodes.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Clean up expired revoked tokens
    const expiredTokens = await db
        .collection(REVOKED_TOKENS_COLLECTION)
        .where('expires_at', '<', now)
        .get();

    expiredTokens.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}
