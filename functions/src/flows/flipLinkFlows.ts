import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';
import { checkFeedMembership, getFeedData } from '../tools/feedTools';

const db = admin.firestore();

// Input schemas
const GenerateFlipLinkInputSchema = z.object({
    uid: z.string(),
    feedId: z.string(),
    expiresInHours: z.number().default(168).optional(), // 7 days default
    singleUse: z.boolean().default(false).optional(),
});

const RedeemFlipLinkInputSchema = z.object({
    uid: z.string(),
    linkId: z.string(),
});

const GetFlipLinkInputSchema = z.object({
    linkId: z.string(),
});

// Output schemas
const FlipLinkOutputSchema = z.object({
    linkId: z.string(),
    feedId: z.string(),
    feedName: z.string(),
    shortUrl: z.string(),
    deepLink: z.string(),
    expiresAt: z.string(),
    singleUse: z.boolean(),
    used: z.boolean(),
});

const GenerateFlipLinkOutputSchema = z.object({
    linkId: z.string(),
    shortUrl: z.string(),
    deepLink: z.string(),
    expiresAt: z.string(),
    success: z.boolean(),
    message: z.string(),
});

const RedeemFlipLinkOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    feedId: z.string(),
    feedName: z.string(),
});

/**
 * Generate a short code for Flip Links
 * Format: 6 character alphanumeric (e.g., abc123)
 */
function generateShortCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate Flip Link for a Feed
 *
 * This flow:
 * 1. Verifies user is a member of the Feed
 * 2. Generates a unique short code
 * 3. Creates Flip Link document
 * 4. Returns shareable URLs
 *
 * Flip Links are the primary growth mechanism.
 * They allow members to invite others to join their Feeds.
 */
export const generateFlipLinkFlow = ai.defineFlow(
    {
        name: 'generateFlipLinkFlow',
        inputSchema: GenerateFlipLinkInputSchema,
        outputSchema: GenerateFlipLinkOutputSchema,
    },
    async (input: z.infer<typeof GenerateFlipLinkInputSchema>) => {
        const { uid, feedId, expiresInHours, singleUse } = input;

        // Verify Feed exists
        const feed = await getFeedData(feedId);
        if (!feed) {
            throw new HttpsError('not-found', 'Feed not found');
        }

        // Check user is a member
        const membership = await checkFeedMembership(feedId, uid);
        if (!membership) {
            throw new HttpsError(
                'permission-denied',
                'Must be a member of the Feed to generate Flip Links'
            );
        }

        // Generate unique short code
        let shortCode = generateShortCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure uniqueness
        while (attempts < maxAttempts) {
            const existing = await db.collection('flipLinks').doc(shortCode).get();
            if (!existing.exists) {
                break;
            }
            shortCode = generateShortCode();
            attempts++;
        }

        if (attempts === maxAttempts) {
            throw new HttpsError('internal', 'Failed to generate unique Flip Link');
        }

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 168));

        // Create Flip Link document
        await db
            .collection('flipLinks')
            .doc(shortCode)
            .set({
                feedId,
                feedName: feed.name,
                createdBy: uid,
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                singleUse: singleUse || false,
                used: false,
                usedBy: null,
                usedAt: null,
                stats: {
                    viewCount: 0,
                    redeemCount: 0,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        // Generate URLs
        // TODO: Phase 3 - Use Firebase Dynamic Links or custom domain
        const shortUrl = `https://flip.to/${shortCode}`;
        const deepLink = `flipfeeds://feed/${shortCode}`;

        return {
            linkId: shortCode,
            shortUrl,
            deepLink,
            expiresAt: expiresAt.toISOString(),
            success: true,
            message: 'Flip Link generated successfully',
        };
    }
);

/**
 * Redeem a Flip Link
 *
 * This flow:
 * 1. Validates the Flip Link (exists, not expired, not used if single-use)
 * 2. Adds user to the Feed
 * 3. Marks link as used if single-use
 * 4. Increments redemption count
 */
export const redeemFlipLinkFlow = ai.defineFlow(
    {
        name: 'redeemFlipLinkFlow',
        inputSchema: RedeemFlipLinkInputSchema,
        outputSchema: RedeemFlipLinkOutputSchema,
    },
    async (input: z.infer<typeof RedeemFlipLinkInputSchema>) => {
        const { uid, linkId } = input;

        // Get Flip Link
        const linkDoc = await db.collection('flipLinks').doc(linkId).get();
        if (!linkDoc.exists) {
            throw new HttpsError('not-found', 'Flip Link not found');
        }

        const linkData = linkDoc.data();
        if (!linkData) {
            throw new HttpsError('not-found', 'Flip Link data missing');
        }

        // Check expiration
        const now = new Date();
        const expiresAt = linkData.expiresAt.toDate();
        if (now > expiresAt) {
            throw new HttpsError('failed-precondition', 'Flip Link has expired');
        }

        // Check if single-use and already used
        if (linkData.singleUse && linkData.used) {
            throw new HttpsError('failed-precondition', 'This Flip Link has already been used');
        }

        // Check if user is already a member
        const existingMembership = await checkFeedMembership(linkData.feedId, uid);
        if (existingMembership) {
            return {
                success: true,
                message: 'Already a member of this Feed',
                feedId: linkData.feedId,
                feedName: linkData.feedName,
            };
        }

        // Import joinFeedFlow to reuse the logic
        const { joinFeedFlow } = await import('./feedFlows');

        // Join the Feed using the existing flow
        try {
            await joinFeedFlow({ uid, feedId: linkData.feedId });
        } catch (error) {
            // If it's a permission denied error about private feeds, that's expected for Flip Links
            if (error instanceof HttpsError && error.code === 'permission-denied') {
                // For Flip Links, we allow joining private Feeds
                // This is handled by directly adding the member
                const { addFeedMember } = await import('../tools/feedTools');
                const { getUserProfile } = await import('../tools/userTools');

                const userProfile = await getUserProfile(uid);
                await addFeedMember(linkData.feedId, uid, {
                    displayName: userProfile?.displayName,
                    photoURL: userProfile?.photoURL,
                    role: 'member',
                });
            } else {
                throw error;
            }
        }

        // Update Flip Link stats and mark as used if single-use
        const updates: Record<string, unknown> = {
            'stats.redeemCount': admin.firestore.FieldValue.increment(1),
        };

        if (linkData.singleUse) {
            updates.used = true;
            updates.usedBy = uid;
            updates.usedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await db.collection('flipLinks').doc(linkId).update(updates);

        return {
            success: true,
            message: `Successfully joined "${linkData.feedName}"`,
            feedId: linkData.feedId,
            feedName: linkData.feedName,
        };
    }
);

/**
 * Get Flip Link details
 *
 * This flow:
 * 1. Returns Flip Link data without redeeming it
 * 2. Used for preview/QR code display
 */
export const getFlipLinkFlow = ai.defineFlow(
    {
        name: 'getFlipLinkFlow',
        inputSchema: GetFlipLinkInputSchema,
        outputSchema: FlipLinkOutputSchema,
    },
    async (input: z.infer<typeof GetFlipLinkInputSchema>) => {
        const { linkId } = input;

        // Get Flip Link
        const linkDoc = await db.collection('flipLinks').doc(linkId).get();
        if (!linkDoc.exists) {
            throw new HttpsError('not-found', 'Flip Link not found');
        }

        const linkData = linkDoc.data();
        if (!linkData) {
            throw new HttpsError('not-found', 'Flip Link data missing');
        }

        // Increment view count
        await db
            .collection('flipLinks')
            .doc(linkId)
            .update({
                'stats.viewCount': admin.firestore.FieldValue.increment(1),
            });

        return {
            linkId,
            feedId: linkData.feedId,
            feedName: linkData.feedName,
            shortUrl: `https://flip.to/${linkId}`,
            deepLink: `flipfeeds://feed/${linkId}`,
            expiresAt: linkData.expiresAt.toDate().toISOString(),
            singleUse: linkData.singleUse,
            used: linkData.used,
        };
    }
);
