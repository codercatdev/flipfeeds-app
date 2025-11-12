import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';
import { checkFeedMembershipTool, getFeedDataTool } from '../tools/feedTools';
import {
    deleteFlipTool,
    getFlipTool,
    listFeedFlipsTool,
    listUserAggregatedFlipsTool,
} from '../tools/flipTools';
import { getUserProfileTool } from '../tools/userTools';
import { generateThumbnailTool, processVideoTool } from '../tools/videoTools';

const db = admin.firestore();

// Input schemas
const CreateFlipInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
    title: z.string().optional(),
    gcsUri: z.string(), // Google Cloud Storage URI
    videoURL: z.string().url(), // Public video URL
});

const DeleteFlipInputSchema = z.object({
    uid: z.string(),
    flipId: z.string(),
});

const GetFlipInputSchema = z.object({
    flipId: z.string(),
    uid: z.string().optional(), // For checking access
});

const ListFeedFlipsInputSchema = z.object({
    feedId: z.string(),
    uid: z.string(), // For checking membership
    limit: z.number().default(20).optional(),
});

const ListUserFlipsInputSchema = z.object({
    uid: z.string(),
    limit: z.number().default(20).optional(),
});

// Output schemas
const FlipOutputSchema = z.object({
    id: z.string(),
    feedId: z.string(),
    authorId: z.string(),
    authorName: z.string().optional(),
    authorPhotoURL: z.string().optional(),
    title: z.string(),
    aiSummary: z.string().optional(),
    videoURL: z.string(),
    thumbnailURL: z.string().optional(),
    tags: z.array(z.string()),
    stats: z.object({
        likeCount: z.number(),
        commentCount: z.number(),
        viewCount: z.number(),
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const CreateFlipOutputSchema = z.object({
    flipId: z.string(),
    success: z.boolean(),
    message: z.string(),
    aiSummary: z.string().optional(),
    suggestedTitle: z.string().optional(),
});

const FlipListOutputSchema = z.object({
    flips: z.array(FlipOutputSchema),
});

const SuccessOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

/**
 * Create a Flip
 *
 * This flow:
 * 1. Verifies user is a member of the Feed
 * 2. Processes video with AI (Phase 2 - currently returns mock data)
 * 3. Creates the Flip document
 * 4. Increments Feed flip count
 */
export const createFlipFlow = ai.defineFlow(
    {
        name: 'createFlipFlow',
        inputSchema: CreateFlipInputSchema,
        outputSchema: CreateFlipOutputSchema,
    },
    async (input: z.infer<typeof CreateFlipInputSchema>) => {
        const { uid, feedId, title, gcsUri, videoURL } = input;

        // Check user is a member of the Feed
        const membership = await checkFeedMembershipTool({ feedId, userId: uid });
        if (!membership) {
            throw new HttpsError(
                'permission-denied',
                'Must be a member of the Feed to create flips'
            );
        }

        // Get user profile for denormalization
        const userProfile = await getUserProfileTool({ uid });
        if (!userProfile) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        // Process video with AI (Phase 2 - currently returns mock data)
        const aiResult = await processVideoTool({ gcsUri, feedId, authorId: uid });

        // Generate thumbnail (Phase 2 - currently returns null)
        const thumbnailURL = await generateThumbnailTool({ gcsUri });

        // Create Flip document
        const newFlipRef = db.collection('flips').doc();
        const flipId = newFlipRef.id;

        await db.runTransaction(async (transaction) => {
            // Create the Flip
            transaction.set(newFlipRef, {
                feedId,
                authorId: uid,
                authorName: userProfile.displayName || null,
                authorPhotoURL: userProfile.photoURL || null,
                title: title || aiResult.suggestedTitle,
                aiSummary: aiResult.summary,
                videoURL,
                thumbnailURL,
                gcsUri,
                tags: aiResult.tags,
                stats: {
                    likeCount: 0,
                    commentCount: 0,
                    viewCount: 0,
                },
                moderation: {
                    isSafe: aiResult.moderation.isSafe,
                    flags: aiResult.moderation.flags,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Increment Feed flip count
            const feedRef = db.collection('feeds').doc(feedId);
            transaction.update(feedRef, {
                'stats.flipCount': admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return {
            flipId,
            success: true,
            message: 'Flip created successfully',
            aiSummary: aiResult.summary,
            suggestedTitle: aiResult.suggestedTitle,
        };
    }
);

/**
 * Delete a Flip
 *
 * This flow:
 * 1. Verifies user is the author or a Feed admin
 * 2. Deletes the Flip
 * 3. Decrements Feed flip count
 */
export const deleteFlipFlow = ai.defineFlow(
    {
        name: 'deleteFlipFlow',
        inputSchema: DeleteFlipInputSchema,
        outputSchema: SuccessOutputSchema,
    },
    async (input: z.infer<typeof DeleteFlipInputSchema>) => {
        const { uid, flipId } = input;

        // Get the Flip
        const flip = await getFlipTool({ flipId });
        if (!flip) {
            throw new HttpsError('not-found', 'Flip not found');
        }

        // Check permissions (author or Feed admin)
        const isAuthor = flip.authorId === uid;
        const membership = await checkFeedMembershipTool({ feedId: flip.feedId, userId: uid });
        const isAdmin = membership?.role === 'admin';
        if (!isAuthor && !isAdmin) {
            throw new HttpsError(
                'permission-denied',
                'Only the author or Feed admins can delete this flip'
            );
        }

        // Delete the Flip
        await deleteFlipTool({ flipId, feedId: flip.feedId });

        return {
            success: true,
            message: 'Flip deleted successfully',
        };
    }
);

/**
 * Get a Flip by ID
 *
 * This flow:
 * 1. Verifies user has access (member of the Feed or public Feed)
 * 2. Returns the Flip data
 */
export const getFlipFlow = ai.defineFlow(
    {
        name: 'getFlipFlow',
        inputSchema: GetFlipInputSchema,
        outputSchema: FlipOutputSchema,
    },
    async (input: z.infer<typeof GetFlipInputSchema>) => {
        const { flipId, uid } = input;

        const flip = await getFlipTool({ flipId });
        if (!flip) {
            throw new HttpsError('not-found', 'Flip not found');
        }

        // Check access: member of the Feed or public Feed
        if (uid) {
            const feed = await getFeedDataTool({ feedId: flip.feedId });
            if (feed?.visibility === 'private' || feed?.visibility === 'personal') {
                const membership = await checkFeedMembershipTool({
                    feedId: flip.feedId,
                    userId: uid,
                });
                if (!membership) {
                    throw new HttpsError(
                        'permission-denied',
                        'Must be a member of the Feed to view this flip'
                    );
                }
            }
        }

        return {
            id: flip.id,
            feedId: flip.feedId,
            authorId: flip.authorId,
            authorName: flip.authorName,
            authorPhotoURL: flip.authorPhotoURL,
            title: flip.title,
            aiSummary: flip.aiSummary,
            videoURL: flip.videoURL,
            thumbnailURL: flip.thumbnailURL,
            tags: flip.tags,
            stats: flip.stats,
            createdAt: flip.createdAt.toISOString(),
            updatedAt: flip.updatedAt.toISOString(),
        };
    }
);

/**
 * List flips from a specific Feed
 */
export const listFeedFlipsFlow = ai.defineFlow(
    {
        name: 'listFeedFlipsFlow',
        inputSchema: ListFeedFlipsInputSchema,
        outputSchema: FlipListOutputSchema,
    },
    async (input: z.infer<typeof ListFeedFlipsInputSchema>) => {
        const { feedId, uid, limit } = input;

        // Check membership for private/personal Feeds
        const feed = await getFeedDataTool({ feedId });
        if (feed?.visibility === 'private' || feed?.visibility === 'personal') {
            const membership = await checkFeedMembershipTool({ feedId, userId: uid });
            if (!membership) {
                throw new HttpsError(
                    'permission-denied',
                    'Must be a member of the Feed to view flips'
                );
            }
        }

        const flips = await listFeedFlipsTool({ feedId, limit });

        return {
            flips: flips.map((flip: any) => ({
                id: flip.id,
                feedId: flip.feedId,
                authorId: flip.authorId,
                authorName: flip.authorName,
                authorPhotoURL: flip.authorPhotoURL,
                title: flip.title,
                aiSummary: flip.aiSummary,
                videoURL: flip.videoURL,
                thumbnailURL: flip.thumbnailURL,
                tags: flip.tags,
                stats: flip.stats,
                createdAt: flip.createdAt.toISOString(),
                updatedAt: flip.updatedAt.toISOString(),
            })),
        };
    }
);

/**
 * List aggregated flips from all user's Feeds
 */
export const listUserFlipsFlow = ai.defineFlow(
    {
        name: 'listUserFlipsFlow',
        inputSchema: ListUserFlipsInputSchema,
        outputSchema: FlipListOutputSchema,
    },
    async (input: z.infer<typeof ListUserFlipsInputSchema>) => {
        const { uid, limit } = input;

        const flips = await listUserAggregatedFlipsTool({ userId: uid, limit });

        return {
            flips: flips.map((flip: any) => ({
                id: flip.id,
                feedId: flip.feedId,
                authorId: flip.authorId,
                authorName: flip.authorName,
                authorPhotoURL: flip.authorPhotoURL,
                title: flip.title,
                aiSummary: flip.aiSummary,
                videoURL: flip.videoURL,
                thumbnailURL: flip.thumbnailURL,
                tags: flip.tags,
                stats: flip.stats,
                createdAt: flip.createdAt.toISOString(),
                updatedAt: flip.updatedAt.toISOString(),
            })),
        };
    }
);
