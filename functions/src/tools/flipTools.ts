import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

// ============================================================================
// SCHEMAS
// ============================================================================

export const FlipSchema = z.object({
    id: z.string(),
    feedId: z.string(),
    authorId: z.string(),
    authorName: z.string().optional(),
    authorPhotoURL: z.string().url().optional(),
    title: z.string(),
    aiSummary: z.string().optional(),
    videoURL: z.string().url(),
    thumbnailURL: z.string().url().optional(),
    gcsUri: z.string().optional(),
    tags: z.array(z.string()).default([]),
    stats: z.object({
        likeCount: z.number().default(0),
        commentCount: z.number().default(0),
        viewCount: z.number().default(0),
    }),
    moderation: z.object({
        isSafe: z.boolean().default(true),
        flags: z.array(z.string()).default([]),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CommentSchema = z.object({
    id: z.string(),
    flipId: z.string(),
    authorId: z.string(),
    authorName: z.string().optional(),
    authorPhotoURL: z.string().url().optional(),
    text: z.string(),
    createdAt: z.date(),
});

export type Flip = z.infer<typeof FlipSchema>;
export type Comment = z.infer<typeof CommentSchema>;

// ============================================================================
// GENKIT TOOLS
// ============================================================================

/**
 * Get a Flip by ID
 */
export const getFlipTool = ai.defineTool(
    {
        name: 'getFlip',
        description: 'Retrieve a flip (video) by its ID',
        inputSchema: z.object({
            flipId: z.string().describe('The flip ID to retrieve'),
        }),
        outputSchema: FlipSchema.nullable(),
    },
    async (input) => {
        const flipDoc = await db.collection('flips').doc(input.flipId).get();

        if (!flipDoc.exists) {
            return null;
        }

        const data = flipDoc.data();
        return {
            id: input.flipId,
            feedId: data?.feedId || '',
            authorId: data?.authorId || '',
            authorName: data?.authorName,
            authorPhotoURL: data?.authorPhotoURL,
            title: data?.title || '',
            aiSummary: data?.aiSummary,
            videoURL: data?.videoURL || '',
            thumbnailURL: data?.thumbnailURL,
            gcsUri: data?.gcsUri,
            tags: data?.tags || [],
            stats: {
                likeCount: data?.stats?.likeCount || 0,
                commentCount: data?.stats?.commentCount || 0,
                viewCount: data?.stats?.viewCount || 0,
            },
            moderation: {
                isSafe: data?.moderation?.isSafe ?? true,
                flags: data?.moderation?.flags || [],
            },
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    }
);

/**
 * List flips from a specific Feed
 */
export const listFeedFlipsTool = ai.defineTool(
    {
        name: 'listFeedFlips',
        description: 'List all flips (videos) from a specific feed',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            limit: z.number().default(20).optional().describe('Maximum number of flips to return'),
        }),
        outputSchema: z.array(FlipSchema),
    },
    async (input) => {
        const snapshot = await db
            .collection('flips')
            .where('feedId', '==', input.feedId)
            .orderBy('createdAt', 'desc')
            .limit(input.limit || 20)
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                feedId: data.feedId || '',
                authorId: data.authorId || '',
                authorName: data.authorName,
                authorPhotoURL: data.authorPhotoURL,
                title: data.title || '',
                aiSummary: data.aiSummary,
                videoURL: data.videoURL || '',
                thumbnailURL: data.thumbnailURL,
                gcsUri: data.gcsUri,
                tags: data.tags || [],
                stats: {
                    likeCount: data.stats?.likeCount || 0,
                    commentCount: data.stats?.commentCount || 0,
                    viewCount: data.stats?.viewCount || 0,
                },
                moderation: {
                    isSafe: data.moderation?.isSafe ?? true,
                    flags: data.moderation?.flags || [],
                },
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };
        });
    }
);

/**
 * List aggregated flips from all user's Feeds
 */
export const listUserAggregatedFlipsTool = ai.defineTool(
    {
        name: 'listUserAggregatedFlips',
        description:
            "List flips from all feeds that a user is a member of (user's aggregated feed)",
        inputSchema: z.object({
            userId: z.string().describe('The user ID'),
            limit: z.number().default(20).optional().describe('Maximum number of flips to return'),
        }),
        outputSchema: z.array(FlipSchema),
    },
    async (input) => {
        // Get all Feeds user belongs to
        const userFeedsSnapshot = await db.collection(`users/${input.userId}/feeds`).get();

        const feedIds = userFeedsSnapshot.docs.map((doc) => doc.id);

        if (feedIds.length === 0) {
            return [];
        }

        // Firestore 'in' query supports up to 10 items
        // For production, this needs batching or a different approach
        const chunkedFeedIds = feedIds.slice(0, 10);

        const snapshot = await db
            .collection('flips')
            .where('feedId', 'in', chunkedFeedIds)
            .orderBy('createdAt', 'desc')
            .limit(input.limit || 20)
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                feedId: data.feedId || '',
                authorId: data.authorId || '',
                authorName: data.authorName,
                authorPhotoURL: data.authorPhotoURL,
                title: data.title || '',
                aiSummary: data.aiSummary,
                videoURL: data.videoURL || '',
                thumbnailURL: data.thumbnailURL,
                gcsUri: data.gcsUri,
                tags: data.tags || [],
                stats: {
                    likeCount: data.stats?.likeCount || 0,
                    commentCount: data.stats?.commentCount || 0,
                    viewCount: data.stats?.viewCount || 0,
                },
                moderation: {
                    isSafe: data.moderation?.isSafe ?? true,
                    flags: data.moderation?.flags || [],
                },
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };
        });
    }
);

/**
 * Delete a Flip (admin/author only - enforced in flows)
 */
export const deleteFlipTool = ai.defineTool(
    {
        name: 'deleteFlip',
        description: 'Delete a flip and update feed statistics',
        inputSchema: z.object({
            flipId: z.string().describe('The flip ID to delete'),
            feedId: z.string().describe('The feed ID that the flip belongs to'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        const batch = db.batch();

        // Delete the flip
        const flipRef = db.collection('flips').doc(input.flipId);
        batch.delete(flipRef);

        // Decrement flip count in Feed
        const feedRef = db.collection('feeds').doc(input.feedId);
        batch.update(feedRef, {
            'stats.flipCount': admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();

        // Note: In production, also delete associated comments, likes, etc.
        // and schedule video deletion from Storage
    }
);

/**
 * Increment flip view count
 */
export const incrementFlipViewCountTool = ai.defineTool(
    {
        name: 'incrementFlipViewCount',
        description: 'Increment the view count of a flip by 1',
        inputSchema: z.object({
            flipId: z.string().describe('The flip ID'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        await db
            .collection('flips')
            .doc(input.flipId)
            .update({
                'stats.viewCount': admin.firestore.FieldValue.increment(1),
            });
    }
);

/**
 * List comments for a Flip
 */
export const listFlipCommentsTool = ai.defineTool(
    {
        name: 'listFlipComments',
        description: 'List all comments for a flip',
        inputSchema: z.object({
            flipId: z.string().describe('The flip ID'),
            limit: z
                .number()
                .default(50)
                .optional()
                .describe('Maximum number of comments to return'),
        }),
        outputSchema: z.array(CommentSchema),
    },
    async (input) => {
        const snapshot = await db
            .collection('flips')
            .doc(input.flipId)
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(input.limit || 50)
            .get();

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                flipId: input.flipId,
                authorId: data.authorId || '',
                authorName: data.authorName,
                authorPhotoURL: data.authorPhotoURL,
                text: data.text || '',
                createdAt: data.createdAt?.toDate() || new Date(),
            };
        });
    }
);
