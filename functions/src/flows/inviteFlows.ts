import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';
import { checkFeedMembership, getFeedData } from '../tools/feedTools';

const db = admin.firestore();

// Input schemas
const GenerateInviteInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
    expiresInHours: z.number().default(168).optional(), // 7 days default
});

const AcceptInviteInputSchema = z.object({
    uid: z.string(),
    inviteId: z.string(),
});

const GetInviteInputSchema = z.object({
    inviteId: z.string(),
});

const ListFeedInvitesInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
});

// Output schemas
const InviteOutputSchema = z.object({
    inviteId: z.string(),
    feedId: z.string(),
    feedName: z.string(),
    inviteUrl: z.string(),
    expiresAt: z.string(),
    consumed: z.boolean(),
});

const GenerateInviteOutputSchema = z.object({
    inviteId: z.string(),
    inviteUrl: z.string(),
    expiresAt: z.string(),
    success: z.boolean(),
    message: z.string(),
});

const AcceptInviteOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    feedId: z.string(),
    feedName: z.string(),
});

const InviteListOutputSchema = z.object({
    invites: z.array(InviteOutputSchema),
});

/**
 * Generate a single-use invite for a private Feed
 *
 * This flow:
 * 1. Verifies user is an admin of the Feed
 * 2. Verifies Feed is private
 * 3. Creates an invite document
 * 4. Returns shareable invite URL
 *
 * Unlike Flip Links (which are for any member to share),
 * Invites are admin-only and single-use.
 */
export const generateInviteFlow = ai.defineFlow(
    {
        name: 'generateInviteFlow',
        inputSchema: GenerateInviteInputSchema,
        outputSchema: GenerateInviteOutputSchema,
    },
    async (input: z.infer<typeof GenerateInviteInputSchema>) => {
        const { uid, feedId, expiresInHours } = input;

        // Verify Feed exists and is private
        const feed = await getFeedData(feedId);
        if (!feed) {
            throw new HttpsError('not-found', 'Feed not found');
        }

        if (feed.visibility !== 'private') {
            throw new HttpsError(
                'failed-precondition',
                'Invites are only for private Feeds. Use Flip Links for public Feeds.'
            );
        }

        // Check user is an admin
        const membership = await checkFeedMembership(feedId, uid);
        if (!membership || membership.role !== 'admin') {
            throw new HttpsError(
                'permission-denied',
                'Only admins can generate invites for private Feeds'
            );
        }

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 168));

        // Create invite document
        const inviteRef = db.collection('v1/feeds').doc(feedId).collection('invites').doc();
        const inviteId = inviteRef.id;

        await inviteRef.set({
            feedId,
            feedName: feed.name,
            createdBy: uid,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            consumed: false,
            consumedBy: null,
            consumedAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Generate invite URL
        // TODO: Phase 3 - Use custom domain
        const inviteUrl = `https://flipfeeds.app/invite/${inviteId}`;

        return {
            inviteId,
            inviteUrl,
            expiresAt: expiresAt.toISOString(),
            success: true,
            message: 'Invite generated successfully',
        };
    }
);

/**
 * Accept a private Feed invite
 *
 * This flow:
 * 1. Validates the invite (exists, not expired, not consumed)
 * 2. Adds user to the private Feed
 * 3. Marks invite as consumed
 */
export const acceptInviteFlow = ai.defineFlow(
    {
        name: 'acceptInviteFlow',
        inputSchema: AcceptInviteInputSchema,
        outputSchema: AcceptInviteOutputSchema,
    },
    async (input: z.infer<typeof AcceptInviteInputSchema>) => {
        const { uid, inviteId } = input;

        // Find the invite across all Feeds using collection group query
        const invitesSnapshot = await db
            .collectionGroup('invites')
            .where(admin.firestore.FieldPath.documentId(), '==', inviteId)
            .limit(1)
            .get();

        if (invitesSnapshot.empty) {
            throw new HttpsError('not-found', 'Invite not found');
        }

        const inviteDoc = invitesSnapshot.docs[0];
        const inviteData = inviteDoc.data();

        // Check expiration
        const now = new Date();
        const expiresAt = inviteData.expiresAt.toDate();
        if (now > expiresAt) {
            throw new HttpsError('failed-precondition', 'Invite has expired');
        }

        // Check if already consumed
        if (inviteData.consumed) {
            throw new HttpsError('failed-precondition', 'This invite has already been used');
        }

        // Check if user is already a member
        const existingMembership = await checkFeedMembership(inviteData.feedId, uid);
        if (existingMembership) {
            return {
                success: true,
                message: 'Already a member of this Feed',
                feedId: inviteData.feedId,
                feedName: inviteData.feedName,
            };
        }

        // Add user to the Feed
        const { addFeedMember } = await import('../tools/feedTools');
        const { getUserProfile } = await import('../tools/userTools');

        const userProfile = await getUserProfile(uid);
        await addFeedMember(inviteData.feedId, uid, {
            displayName: userProfile?.displayName,
            photoURL: userProfile?.photoURL,
            role: 'member',
        });

        // Mark invite as consumed
        await inviteDoc.ref.update({
            consumed: true,
            consumedBy: uid,
            consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            message: `Successfully joined "${inviteData.feedName}"`,
            feedId: inviteData.feedId,
            feedName: inviteData.feedName,
        };
    }
);

/**
 * Get invite details
 *
 * This flow:
 * 1. Returns invite data without accepting it
 * 2. Used for preview before accepting
 */
export const getInviteFlow = ai.defineFlow(
    {
        name: 'getInviteFlow',
        inputSchema: GetInviteInputSchema,
        outputSchema: InviteOutputSchema,
    },
    async (input: z.infer<typeof GetInviteInputSchema>) => {
        const { inviteId } = input;

        // Find the invite
        const invitesSnapshot = await db
            .collectionGroup('invites')
            .where(admin.firestore.FieldPath.documentId(), '==', inviteId)
            .limit(1)
            .get();

        if (invitesSnapshot.empty) {
            throw new HttpsError('not-found', 'Invite not found');
        }

        const inviteDoc = invitesSnapshot.docs[0];
        const inviteData = inviteDoc.data();

        return {
            inviteId,
            feedId: inviteData.feedId,
            feedName: inviteData.feedName,
            inviteUrl: `https://flipfeeds.app/invite/${inviteId}`,
            expiresAt: inviteData.expiresAt.toDate().toISOString(),
            consumed: inviteData.consumed,
        };
    }
);

/**
 * List all active invites for a Feed (admin only)
 */
export const listFeedInvitesFlow = ai.defineFlow(
    {
        name: 'listFeedInvitesFlow',
        inputSchema: ListFeedInvitesInputSchema,
        outputSchema: InviteListOutputSchema,
    },
    async (input: z.infer<typeof ListFeedInvitesInputSchema>) => {
        const { uid, feedId } = input;

        // Check user is an admin
        const membership = await checkFeedMembership(feedId, uid);
        if (!membership || membership.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only admins can view Feed invites');
        }

        // Get all invites for this Feed
        const invitesSnapshot = await db
            .collection('v1/feeds')
            .doc(feedId)
            .collection('invites')
            .orderBy('createdAt', 'desc')
            .get();

        const invites = invitesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                inviteId: doc.id,
                feedId: data.feedId,
                feedName: data.feedName,
                inviteUrl: `https://flipfeeds.app/invite/${doc.id}`,
                expiresAt: data.expiresAt.toDate().toISOString(),
                consumed: data.consumed,
            };
        });

        return {
            invites,
        };
    }
);
