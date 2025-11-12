import * as admin from 'firebase-admin';
import { z } from 'zod';

const db = admin.firestore();

// Schemas
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

/**
 * Get Feed data from Firestore
 */
export async function getFeedData(feedId: string): Promise<Feed | null> {
    const feedDoc = await db.collection('v1/feeds').doc(feedId).get();

    if (!feedDoc.exists) {
        return null;
    }

    const data = feedDoc.data();
    return {
        id: feedId,
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

/**
 * Check if user is a member of a Feed
 */
export async function checkFeedMembership(feedId: string, userId: string): Promise<Member | null> {
    const memberDoc = await db
        .collection('v1/feeds')
        .doc(feedId)
        .collection('members')
        .doc(userId)
        .get();

    if (!memberDoc.exists) {
        return null;
    }

    const data = memberDoc.data();
    return {
        userId,
        displayName: data?.displayName,
        photoURL: data?.photoURL,
        role: data?.role || 'member',
        joinedAt: data?.joinedAt?.toDate() || new Date(),
    };
}

/**
 * List all members of a Feed
 */
export async function listFeedMembers(feedId: string, limit = 100): Promise<Member[]> {
    const membersSnapshot = await db
        .collection('v1/feeds')
        .doc(feedId)
        .collection('members')
        .limit(limit)
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

/**
 * Search public Feeds by name or tags
 */
export async function listPublicFeeds(options: {
    query?: string;
    tags?: string[];
    limit?: number;
}): Promise<Feed[]> {
    const { limit = 20 } = options;

    const query = db.collection('v1/feeds').where('visibility', '==', 'public').limit(limit);

    // Note: For production, implement full-text search with Algolia or similar
    // This is a basic implementation
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

/**
 * Get user's Personal Feed reference
 */
export async function getUserPersonalFeed(userId: string): Promise<string | null> {
    const personalFeedDoc = await db
        .collection('v1/users')
        .doc(userId)
        .collection('personalFeed')
        .doc('ref')
        .get();

    if (!personalFeedDoc.exists) {
        return null;
    }

    return personalFeedDoc.data()?.feedId || null;
}

/**
 * Add member to Feed (used by flows)
 */
export async function addFeedMember(
    feedId: string,
    userId: string,
    memberData: {
        displayName?: string;
        photoURL?: string;
        role?: 'admin' | 'moderator' | 'member';
    }
): Promise<void> {
    const batch = db.batch();

    // Add to members sub-collection
    const memberRef = db.collection('v1/feeds').doc(feedId).collection('members').doc(userId);
    batch.set(memberRef, {
        userId,
        displayName: memberData.displayName || null,
        photoURL: memberData.photoURL || null,
        role: memberData.role || 'member',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add reverse lookup
    const userFeedRef = db.collection('v1/users').doc(userId).collection('feeds').doc(feedId);
    batch.set(userFeedRef, {
        feedId,
        role: memberData.role || 'member',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment member count
    const feedRef = db.collection('v1/feeds').doc(feedId);
    batch.update(feedRef, {
        'stats.memberCount': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment user's Feed count
    const userRef = db.collection('v1/users').doc(userId);
    batch.update(userRef, {
        feedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
}

/**
 * Remove member from Feed (used by flows)
 */
export async function removeFeedMember(feedId: string, userId: string): Promise<void> {
    const batch = db.batch();

    // Remove from members sub-collection
    const memberRef = db.collection('v1/feeds').doc(feedId).collection('members').doc(userId);
    batch.delete(memberRef);

    // Remove reverse lookup
    const userFeedRef = db.collection('v1/users').doc(userId).collection('feeds').doc(feedId);
    batch.delete(userFeedRef);

    // Decrement member count
    const feedRef = db.collection('v1/feeds').doc(feedId);
    batch.update(feedRef, {
        'stats.memberCount': admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Decrement user's Feed count
    const userRef = db.collection('v1/users').doc(userId);
    batch.update(userRef, {
        feedCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
}

/**
 * Update member role (used by flows)
 */
export async function updateMemberRole(
    feedId: string,
    userId: string,
    role: 'admin' | 'moderator' | 'member'
): Promise<void> {
    const batch = db.batch();

    // Update in members sub-collection
    const memberRef = db.collection('v1/feeds').doc(feedId).collection('members').doc(userId);
    batch.update(memberRef, { role });

    // Update in reverse lookup
    const userFeedRef = db.collection('v1/users').doc(userId).collection('feeds').doc(feedId);
    batch.update(userFeedRef, { role });

    await batch.commit();
}
