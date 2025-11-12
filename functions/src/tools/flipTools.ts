import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();

// Schemas
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

/**
 * Get a Flip by ID
 */
export async function getFlip(flipId: string): Promise<Flip | null> {
    const flipDoc = await db.collection('v1/flips').doc(flipId).get();

    if (!flipDoc.exists) {
        return null;
    }

    const data = flipDoc.data();
    return {
        id: flipId,
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

/**
 * List flips from a specific Feed
 */
export async function listFeedFlips(feedId: string, limit = 20): Promise<Flip[]> {
    const snapshot = await db
        .collection('v1/flips')
        .where('feedId', '==', feedId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
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

/**
 * List aggregated flips from all user's Feeds
 */
export async function listUserAggregatedFlips(userId: string, limit = 20): Promise<Flip[]> {
    // Get all Feeds user belongs to
    const userFeedsSnapshot = await db.collection(`v1/users/${userId}/feeds`).get();

    const feedIds = userFeedsSnapshot.docs.map((doc) => doc.id);

    if (feedIds.length === 0) {
        return [];
    }

    // Firestore 'in' query supports up to 10 items
    // For production, this needs batching or a different approach
    const chunkedFeedIds = feedIds.slice(0, 10);

    const snapshot = await db
        .collection('v1/flips')
        .where('feedId', 'in', chunkedFeedIds)
        .orderBy('createdAt', 'desc')
        .limit(limit)
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

/**
 * Delete a Flip (admin/author only - enforced in flows)
 */
export async function deleteFlip(flipId: string, feedId: string): Promise<void> {
    const batch = db.batch();

    // Delete the flip
    const flipRef = db.collection('v1/flips').doc(flipId);
    batch.delete(flipRef);

    // Decrement flip count in Feed
    const feedRef = db.collection('v1/feeds').doc(feedId);
    batch.update(feedRef, {
        'stats.flipCount': admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Note: In production, also delete associated comments, likes, etc.
    // and schedule video deletion from Storage
}

/**
 * Increment flip view count
 */
export async function incrementFlipViewCount(flipId: string): Promise<void> {
    await db
        .collection('v1/flips')
        .doc(flipId)
        .update({
            'stats.viewCount': admin.firestore.FieldValue.increment(1),
        });
}

/**
 * List comments for a Flip
 */
export async function listFlipComments(flipId: string, limit = 50): Promise<Comment[]> {
    const snapshot = await db
        .collection('v1/flips')
        .doc(flipId)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            flipId,
            authorId: data.authorId || '',
            authorName: data.authorName,
            authorPhotoURL: data.authorPhotoURL,
            text: data.text || '',
            createdAt: data.createdAt?.toDate() || new Date(),
        };
    });
}
