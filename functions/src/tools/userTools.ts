import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();

// Schemas
export const UserProfileSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    photoURL: z.string().url().optional(),
    bio: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email().optional(),
    feedCount: z.number().default(0),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await db.collection('v1/users').doc(uid).get();

    if (!userDoc.exists) {
        return null;
    }

    const data = userDoc.data();
    return {
        uid,
        displayName: data?.displayName,
        username: data?.username,
        photoURL: data?.photoURL,
        bio: data?.bio,
        phoneNumber: data?.phoneNumber,
        email: data?.email,
        feedCount: data?.feedCount || 0,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}

/**
 * Get all Feeds a user belongs to (reverse lookup)
 */
export async function getUserFeeds(
    uid: string
): Promise<Array<{ feedId: string; role: string; joinedAt: Date }>> {
    const feedsSnapshot = await db.collection(`v1/users/${uid}/feeds`).get();

    return feedsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            feedId: doc.id,
            role: data.role || 'member',
            joinedAt: data.joinedAt?.toDate() || new Date(),
        };
    });
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
    const usernameDoc = await db.collection('v1/usernames').doc(username.toLowerCase()).get();
    return !usernameDoc.exists;
}

/**
 * Claim a username (used during profile update)
 */
export async function claimUsername(uid: string, username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    try {
        // Attempt to create the username document
        await db.collection('v1/usernames').doc(normalizedUsername).create({
            userId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
    } catch {
        // Username already exists
        return false;
    }
}

/**
 * Release a username (used when changing username)
 */
export async function releaseUsername(username: string): Promise<void> {
    await db.collection('v1/usernames').doc(username.toLowerCase()).delete();
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    uid: string,
    updates: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    await db
        .collection('v1/users')
        .doc(uid)
        .update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
}

/**
 * Create user profile (called on signup)
 */
export async function createUserProfile(data: {
    uid: string;
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    email?: string;
}): Promise<void> {
    await db
        .collection('v1/users')
        .doc(data.uid)
        .set({
            displayName: data.displayName || null,
            username: null,
            photoURL: data.photoURL || null,
            bio: null,
            phoneNumber: data.phoneNumber || null,
            email: data.email || null,
            feedCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
}
