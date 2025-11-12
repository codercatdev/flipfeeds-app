import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

// ============================================================================
// SCHEMAS
// ============================================================================

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

// ============================================================================
// GENKIT TOOLS
// ============================================================================

/**
 * Get user profile from Firestore
 */
export const getUserProfileTool = ai.defineTool(
    {
        name: 'getUserProfile',
        description: 'Retrieves a user profile from Firestore by user ID',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
        }),
        outputSchema: UserProfileSchema.nullable(),
    },
    async (input, { context }) => {
        console.log('Context in tool', JSON.stringify(context, null, 2));
        const userDoc = await db.collection('users').doc(input.uid).get();

        if (!userDoc.exists) {
            return null;
        }

        const data = userDoc.data();
        return {
            uid: input.uid,
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
);

/**
 * Get all Feeds a user belongs to (reverse lookup)
 */
export const getUserFeedsTool = ai.defineTool(
    {
        name: 'getUserFeeds',
        description: 'Get all feeds that a user is a member of',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
        }),
        outputSchema: z.array(
            z.object({
                feedId: z.string(),
                role: z.string(),
                joinedAt: z.date(),
            })
        ),
    },
    async (input) => {
        const feedsSnapshot = await db.collection(`users/${input.uid}/feeds`).get();

        return feedsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                feedId: doc.id,
                role: data.role || 'member',
                joinedAt: data.joinedAt?.toDate() || new Date(),
            };
        });
    }
);

/**
 * Check if username is available
 */
export const isUsernameAvailableTool = ai.defineTool(
    {
        name: 'isUsernameAvailable',
        description: 'Check if a username is available for registration',
        inputSchema: z.object({
            username: z.string().min(3).max(20).describe('The username to check'),
        }),
        outputSchema: z.boolean(),
    },
    async (input) => {
        const normalizedUsername = input.username.toLowerCase();
        const usernameDoc = await db.collection('usernames').doc(normalizedUsername).get();
        return !usernameDoc.exists;
    }
);

/**
 * Claim a username (used during profile update)
 */
export const claimUsernameTool = ai.defineTool(
    {
        name: 'claimUsername',
        description: 'Claim a username for a user (registers it in the usernames collection)',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
            username: z.string().min(3).max(20).describe('The username to claim'),
        }),
        outputSchema: z.boolean().describe('True if username was successfully claimed'),
    },
    async (input) => {
        const normalizedUsername = input.username.toLowerCase();

        try {
            await db.collection('usernames').doc(normalizedUsername).create({
                userId: input.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return true;
        } catch {
            // Username already exists
            return false;
        }
    }
);

/**
 * Release a username (used when changing username)
 */
export const releaseUsernameTool = ai.defineTool(
    {
        name: 'releaseUsername',
        description: 'Release a username (delete from usernames collection)',
        inputSchema: z.object({
            username: z.string().describe('The username to release'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        await db.collection('usernames').doc(input.username.toLowerCase()).delete();
    }
);

/**
 * Update user profile
 */
export const updateUserProfileTool = ai.defineTool(
    {
        name: 'updateUserProfile',
        description: 'Update user profile fields in Firestore',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
            updates: z
                .object({
                    displayName: z.string().optional(),
                    username: z.string().optional(),
                    bio: z.string().optional(),
                    photoURL: z.string().url().optional(),
                    phoneNumber: z.string().optional(),
                    email: z.string().email().optional(),
                })
                .describe('The fields to update'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        await db
            .collection('users')
            .doc(input.uid)
            .update({
                ...input.updates,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
    }
);

/**
 * Create user profile (called on signup)
 */
export const createUserProfileTool = ai.defineTool(
    {
        name: 'createUserProfile',
        description: 'Create a new user profile in Firestore during signup',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
            displayName: z.string().optional().describe('User display name'),
            photoURL: z.string().url().optional().describe('User profile photo URL'),
            phoneNumber: z.string().optional().describe('User phone number'),
            email: z.string().email().optional().describe('User email address'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        console.log('Creating user profile for UID:', input.uid);
        await db
            .collection('users')
            .doc(input.uid)
            .set({
                displayName: input.displayName || null,
                username: null,
                photoURL: input.photoURL || null,
                bio: null,
                phoneNumber: input.phoneNumber || null,
                email: input.email || null,
                feedCount: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
    }
);
