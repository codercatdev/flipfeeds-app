import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

// ============================================================================
// SCHEMAS
// ============================================================================

export const FeedSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    logoURL: z.string().url().optional(),
    visibility: z.enum(['public', 'private', 'personal']),
    ownerId: z.string(),
    tags: z.array(z.string()).default([]),
    stats: z.object({
        memberCount: z.number().default(0),
        flipCount: z.number().default(0),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const MemberSchema = z.object({
    userId: z.string(),
    displayName: z.string().optional(),
    photoURL: z.string().url().optional(),
    role: z.enum(['admin', 'moderator', 'member']).default('member'),
    joinedAt: z.date(),
});

export type Feed = z.infer<typeof FeedSchema>;
export type Member = z.infer<typeof MemberSchema>;

// ============================================================================
// GENKIT TOOLS
// ============================================================================

/**
 * Get Feed data from Firestore
 */
export const getFeedDataTool = ai.defineTool(
    {
        name: 'getFeedData',
        description: 'Retrieve feed information from Firestore by feed ID',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID to retrieve'),
        }),
        outputSchema: FeedSchema.nullable(),
    },
    async (input) => {
        const feedDoc = await db.collection('feeds').doc(input.feedId).get();

        if (!feedDoc.exists) {
            return null;
        }

        const data = feedDoc.data();
        return {
            id: input.feedId,
            name: data?.name || '',
            description: data?.description,
            logoURL: data?.logoURL,
            visibility: data?.visibility || 'private',
            ownerId: data?.ownerId || '',
            tags: data?.tags || [],
            stats: {
                memberCount: data?.stats?.memberCount || 0,
                flipCount: data?.stats?.flipCount || 0,
            },
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    }
);

/**
 * Check if user is a member of a Feed
 */
export const checkFeedMembershipTool = ai.defineTool(
    {
        name: 'checkFeedMembership',
        description: 'Check if a user is a member of a feed and return their membership details',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            userId: z.string().describe('The user ID to check'),
        }),
        outputSchema: MemberSchema.nullable(),
    },
    async (input) => {
        const memberDoc = await db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId)
            .get();

        if (!memberDoc.exists) {
            return null;
        }

        const data = memberDoc.data();
        return {
            userId: input.userId,
            displayName: data?.displayName,
            photoURL: data?.photoURL,
            role: data?.role || 'member',
            joinedAt: data?.joinedAt?.toDate() || new Date(),
        };
    }
);

/**
 * List all members of a Feed
 */
export const listFeedMembersTool = ai.defineTool(
    {
        name: 'listFeedMembers',
        description: 'Get all members of a feed with their roles and details',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            limit: z
                .number()
                .default(100)
                .optional()
                .describe('Maximum number of members to return'),
        }),
        outputSchema: z.array(MemberSchema),
    },
    async (input) => {
        const membersSnapshot = await db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .limit(input.limit || 100)
            .get();

        return membersSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                userId: doc.id,
                displayName: data.displayName,
                photoURL: data.photoURL,
                role: data.role || 'member',
                joinedAt: data.joinedAt?.toDate() || new Date(),
            };
        });
    }
);

/**
 * Search public Feeds by name or tags
 */
export const listPublicFeedsTool = ai.defineTool(
    {
        name: 'listPublicFeeds',
        description: 'Search and list public feeds (visible to all users)',
        inputSchema: z.object({
            query: z.string().optional().describe('Search query for feed name'),
            tags: z.array(z.string()).optional().describe('Filter by tags'),
            limit: z.number().default(20).optional().describe('Maximum number of feeds to return'),
        }),
        outputSchema: z.array(FeedSchema),
    },
    async (input) => {
        const limit = input.limit || 20;
        const query = db.collection('feeds').where('visibility', '==', 'public').limit(limit);

        // Note: For production, implement full-text search with Algolia or similar
        const snapshot = await query.get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                description: data.description,
                logoURL: data.logoURL,
                visibility: data.visibility || 'private',
                ownerId: data.ownerId || '',
                tags: data.tags || [],
                stats: {
                    memberCount: data.stats?.memberCount || 0,
                    flipCount: data.stats?.flipCount || 0,
                },
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };
        });
    }
);

/**
 * Get user's Personal Feed reference
 */
export const getUserPersonalFeedTool = ai.defineTool(
    {
        name: 'getUserPersonalFeed',
        description: "Get the feed ID of a user's personal feed",
        inputSchema: z.object({
            userId: z.string().describe('The user ID'),
        }),
        outputSchema: z.string().nullable(),
    },
    async (input) => {
        const personalFeedDoc = await db
            .collection('users')
            .doc(input.userId)
            .collection('personalFeed')
            .doc('ref')
            .get();

        if (!personalFeedDoc.exists) {
            return null;
        }

        return personalFeedDoc.data()?.feedId || null;
    }
);

/**
 * Add member to Feed
 */
export const addFeedMemberTool = ai.defineTool(
    {
        name: 'addFeedMember',
        description: 'Add a user as a member to a feed with specified role',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            userId: z.string().describe('The user ID to add'),
            displayName: z.string().optional().describe('User display name'),
            photoURL: z.string().url().optional().describe('User photo URL'),
            role: z
                .enum(['admin', 'moderator', 'member'])
                .default('member')
                .describe('Member role'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        const batch = db.batch();

        // Add to members sub-collection
        const memberRef = db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId);
        batch.set(memberRef, {
            userId: input.userId,
            displayName: input.displayName || null,
            photoURL: input.photoURL || null,
            role: input.role,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Add reverse lookup
        const userFeedRef = db
            .collection('users')
            .doc(input.userId)
            .collection('feeds')
            .doc(input.feedId);
        batch.set(userFeedRef, {
            feedId: input.feedId,
            role: input.role,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Increment member count
        const feedRef = db.collection('feeds').doc(input.feedId);
        batch.update(feedRef, {
            'stats.memberCount': admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Increment user's Feed count
        const userRef = db.collection('users').doc(input.userId);
        batch.update(userRef, {
            feedCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
    }
);

/**
 * Remove member from Feed
 */
export const removeFeedMemberTool = ai.defineTool(
    {
        name: 'removeFeedMember',
        description: 'Remove a user from a feed',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            userId: z.string().describe('The user ID to remove'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        const batch = db.batch();

        // Remove from members sub-collection
        const memberRef = db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId);
        batch.delete(memberRef);

        // Remove reverse lookup
        const userFeedRef = db
            .collection('users')
            .doc(input.userId)
            .collection('feeds')
            .doc(input.feedId);
        batch.delete(userFeedRef);

        // Decrement member count
        const feedRef = db.collection('feeds').doc(input.feedId);
        batch.update(feedRef, {
            'stats.memberCount': admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Decrement user's Feed count
        const userRef = db.collection('users').doc(input.userId);
        batch.update(userRef, {
            feedCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
    }
);

/**
 * Update member role
 */
export const updateMemberRoleTool = ai.defineTool(
    {
        name: 'updateMemberRole',
        description: "Update a feed member's role (admin, moderator, or member)",
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            userId: z.string().describe('The user ID'),
            role: z.enum(['admin', 'moderator', 'member']).describe('The new role'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        const batch = db.batch();

        // Update in members sub-collection
        const memberRef = db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId);
        batch.update(memberRef, { role: input.role });

        // Update in reverse lookup
        const userFeedRef = db
            .collection('users')
            .doc(input.userId)
            .collection('feeds')
            .doc(input.feedId);
        batch.update(userFeedRef, { role: input.role });

        await batch.commit();
    }
);
