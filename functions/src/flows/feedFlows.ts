import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';
import {
    addFeedMember,
    checkFeedMembership,
    getFeedData,
    listPublicFeeds,
    removeFeedMember,
    updateMemberRole,
} from '../tools/feedTools';
import { getUserFeeds, getUserProfile } from '../tools/userTools';

const db = admin.firestore();

// Input schemas
const CreateFeedInputSchema = z.object({
    uid: z.string(),
    name: z.string().min(3).max(50),
    description: z.string().max(250).optional(),
    visibility: z.enum(['public', 'private']),
    tags: z.array(z.string()).optional(),
});

const JoinFeedInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
});

const LeaveFeedInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
});

const KickMemberInputSchema = z.object({
    callerUid: z.string(),
    feedId: z.string(),
    targetUserId: z.string(),
});

const UpdateMemberRoleInputSchema = z.object({
    callerUid: z.string(),
    feedId: z.string(),
    targetUserId: z.string(),
    role: z.enum(['admin', 'moderator', 'member']),
});

const GetFeedDetailsInputSchema = z.object({
    feedId: z.string(),
    uid: z.string().optional(), // For checking membership
});

const ListUserFeedsInputSchema = z.object({
    uid: z.string(),
});

const SearchPublicFeedsInputSchema = z.object({
    query: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().default(20).optional(),
});

// Output schemas
const FeedOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    logoURL: z.string().optional(),
    visibility: z.enum(['public', 'private', 'personal']),
    ownerId: z.string(),
    tags: z.array(z.string()),
    stats: z.object({
        memberCount: z.number(),
        flipCount: z.number(),
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
    // Optional fields for when user is a member
    userRole: z.enum(['admin', 'moderator', 'member']).optional(),
});

const CreateFeedOutputSchema = z.object({
    feedId: z.string(),
    success: z.boolean(),
    message: z.string(),
});

const SuccessOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

const UserFeedListOutputSchema = z.object({
    feeds: z.array(FeedOutputSchema),
});

/**
 * Create a new Feed
 *
 * This flow:
 * 1. Creates the Feed document
 * 2. Adds the creator as the first member (admin role)
 * 3. Creates reverse lookup in user's feeds collection
 * 4. Increments user's feedCount
 *
 * Also creates a Personal Feed on first user creation (handled separately)
 */
export const createFeedFlow = ai.defineFlow(
    {
        name: 'createFeedFlow',
        inputSchema: CreateFeedInputSchema,
        outputSchema: CreateFeedOutputSchema,
    },
    async (input: z.infer<typeof CreateFeedInputSchema>) => {
        const { uid, name, description, visibility, tags } = input;

        // Get user profile for denormalization
        const userProfile = await getUserProfile(uid);
        if (!userProfile) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        // Create new Feed document ID
        const newFeedRef = db.collection('feeds').doc();
        const feedId = newFeedRef.id;

        // Transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            // Create the main Feed document
            transaction.set(newFeedRef, {
                name,
                description: description || null,
                logoURL: 'https://placehold.co/100x100/F26F21/FFFFFF?text=FF',
                visibility,
                ownerId: uid,
                tags: tags || [],
                stats: {
                    memberCount: 1,
                    flipCount: 0,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Add creator as first member (admin role)
            const memberRef = newFeedRef.collection('members').doc(uid);
            transaction.set(memberRef, {
                userId: uid,
                displayName: userProfile.displayName || null,
                photoURL: userProfile.photoURL || null,
                role: 'admin',
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Add reverse lookup
            const userFeedRef = db.collection('users').doc(uid).collection('feeds').doc(feedId);
            transaction.set(userFeedRef, {
                feedId,
                role: 'admin',
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Increment user's Feed count
            const userRef = db.collection('users').doc(uid);
            transaction.update(userRef, {
                feedCount: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });

        return {
            feedId,
            success: true,
            message: `Feed "${name}" created successfully`,
        };
    }
);

/**
 * Join a public Feed
 *
 * This flow:
 * 1. Verifies the Feed exists and is public
 * 2. Checks user is not already a member
 * 3. Adds user as member
 * 4. Updates counts
 */
export const joinFeedFlow = ai.defineFlow(
    {
        name: 'joinFeedFlow',
        inputSchema: JoinFeedInputSchema,
        outputSchema: SuccessOutputSchema,
    },
    async (input: z.infer<typeof JoinFeedInputSchema>) => {
        const { uid, feedId } = input;

        // Get Feed data
        const feed = await getFeedData(feedId);
        if (!feed) {
            throw new HttpsError('not-found', 'Feed not found');
        }

        // Check visibility
        if (feed.visibility === 'private') {
            throw new HttpsError('permission-denied', 'Cannot join private Feed without invite');
        }

        if (feed.visibility === 'personal') {
            throw new HttpsError('permission-denied', 'Cannot join Personal Feeds');
        }

        // Check if already a member
        const existingMembership = await checkFeedMembership(feedId, uid);
        if (existingMembership) {
            throw new HttpsError('already-exists', 'Already a member of this Feed');
        }

        // Get user profile for denormalization
        const userProfile = await getUserProfile(uid);
        if (!userProfile) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        // Add as member
        await addFeedMember(feedId, uid, {
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL,
            role: 'member',
        });

        return {
            success: true,
            message: `Joined Feed "${feed.name}" successfully`,
        };
    }
);

/**
 * Leave a Feed
 *
 * This flow:
 * 1. Verifies user is a member
 * 2. Prevents owner from leaving (must transfer ownership first)
 * 3. Removes membership
 * 4. Updates counts
 */
export const leaveFeedFlow = ai.defineFlow(
    {
        name: 'leaveFeedFlow',
        inputSchema: LeaveFeedInputSchema,
        outputSchema: SuccessOutputSchema,
    },
    async (input: z.infer<typeof LeaveFeedInputSchema>) => {
        const { uid, feedId } = input;

        // Get Feed data
        const feed = await getFeedData(feedId);
        if (!feed) {
            throw new HttpsError('not-found', 'Feed not found');
        }

        // Check membership
        const membership = await checkFeedMembership(feedId, uid);
        if (!membership) {
            throw new HttpsError('not-found', 'Not a member of this Feed');
        }

        // Prevent owner from leaving
        if (feed.ownerId === uid) {
            throw new HttpsError(
                'failed-precondition',
                'Feed owner cannot leave. Transfer ownership first.'
            );
        }

        // Remove membership
        await removeFeedMember(feedId, uid);

        return {
            success: true,
            message: `Left Feed "${feed.name}" successfully`,
        };
    }
);

/**
 * Kick a member from a Feed (admin only)
 */
export const kickMemberFlow = ai.defineFlow(
    {
        name: 'kickMemberFlow',
        inputSchema: KickMemberInputSchema,
        outputSchema: SuccessOutputSchema,
    },
    async (input: z.infer<typeof KickMemberInputSchema>) => {
        const { callerUid, feedId, targetUserId } = input;

        // Check caller is admin
        const callerMembership = await checkFeedMembership(feedId, callerUid);
        if (!callerMembership || callerMembership.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only admins can kick members');
        }

        // Check target is a member
        const targetMembership = await checkFeedMembership(feedId, targetUserId);
        if (!targetMembership) {
            throw new HttpsError('not-found', 'User is not a member of this Feed');
        }

        // Prevent kicking the owner
        const feed = await getFeedData(feedId);
        if (feed?.ownerId === targetUserId) {
            throw new HttpsError('failed-precondition', 'Cannot kick the Feed owner');
        }

        // Remove member
        await removeFeedMember(feedId, targetUserId);

        return {
            success: true,
            message: 'Member removed from Feed',
        };
    }
);

/**
 * Update a member's role (admin only)
 */
export const updateMemberRoleFlow = ai.defineFlow(
    {
        name: 'updateMemberRoleFlow',
        inputSchema: UpdateMemberRoleInputSchema,
        outputSchema: SuccessOutputSchema,
    },
    async (input: z.infer<typeof UpdateMemberRoleInputSchema>) => {
        const { callerUid, feedId, targetUserId, role } = input;

        // Check caller is admin
        const callerMembership = await checkFeedMembership(feedId, callerUid);
        if (!callerMembership || callerMembership.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only admins can update member roles');
        }

        // Check target is a member
        const targetMembership = await checkFeedMembership(feedId, targetUserId);
        if (!targetMembership) {
            throw new HttpsError('not-found', 'User is not a member of this Feed');
        }

        // Update role
        await updateMemberRole(feedId, targetUserId, role);

        return {
            success: true,
            message: `Member role updated to ${role}`,
        };
    }
);

/**
 * Get Feed details
 */
export const getFeedDetailsFlow = ai.defineFlow(
    {
        name: 'getFeedDetailsFlow',
        inputSchema: GetFeedDetailsInputSchema,
        outputSchema: FeedOutputSchema,
    },
    async (input: z.infer<typeof GetFeedDetailsInputSchema>) => {
        const { feedId, uid } = input;

        const feed = await getFeedData(feedId);
        if (!feed) {
            throw new HttpsError('not-found', 'Feed not found');
        }

        let userRole: 'admin' | 'moderator' | 'member' | undefined;
        if (uid) {
            const membership = await checkFeedMembership(feedId, uid);
            userRole = membership?.role;
        }

        return {
            id: feed.id,
            name: feed.name,
            description: feed.description,
            logoURL: feed.logoURL,
            visibility: feed.visibility,
            ownerId: feed.ownerId,
            tags: feed.tags,
            stats: feed.stats,
            createdAt: feed.createdAt.toISOString(),
            updatedAt: feed.updatedAt.toISOString(),
            userRole,
        };
    }
);

/**
 * List all Feeds a user belongs to
 */
export const listUserFeedsFlow = ai.defineFlow(
    {
        name: 'listUserFeedsFlow',
        inputSchema: ListUserFeedsInputSchema,
        outputSchema: UserFeedListOutputSchema,
    },
    async (input: z.infer<typeof ListUserFeedsInputSchema>) => {
        const { uid } = input;

        const userFeeds = await getUserFeeds(uid);

        const feeds = await Promise.all(
            userFeeds.map(async (uf) => {
                const feed = await getFeedData(uf.feedId);
                if (!feed) return null;

                return {
                    id: feed.id,
                    name: feed.name,
                    description: feed.description,
                    logoURL: feed.logoURL,
                    visibility: feed.visibility,
                    ownerId: feed.ownerId,
                    tags: feed.tags,
                    stats: feed.stats,
                    createdAt: feed.createdAt.toISOString(),
                    updatedAt: feed.updatedAt.toISOString(),
                    userRole: uf.role as 'admin' | 'moderator' | 'member',
                };
            })
        );

        return {
            feeds: feeds.filter((f): f is NonNullable<typeof f> => f !== null),
        };
    }
);

/**
 * Search public Feeds
 */
export const searchPublicFeedsFlow = ai.defineFlow(
    {
        name: 'searchPublicFeedsFlow',
        inputSchema: SearchPublicFeedsInputSchema,
        outputSchema: UserFeedListOutputSchema,
    },
    async (input: z.infer<typeof SearchPublicFeedsInputSchema>) => {
        const feeds = await listPublicFeeds({
            query: input.query,
            tags: input.tags,
            limit: input.limit,
        });

        return {
            feeds: feeds.map((feed) => ({
                id: feed.id,
                name: feed.name,
                description: feed.description,
                logoURL: feed.logoURL,
                visibility: feed.visibility,
                ownerId: feed.ownerId,
                tags: feed.tags,
                stats: feed.stats,
                createdAt: feed.createdAt.toISOString(),
                updatedAt: feed.updatedAt.toISOString(),
            })),
        };
    }
);
