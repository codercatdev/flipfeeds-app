import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

// TODO: Implement AI tools
const moderateVideo = async (videoStoragePath: string) => {
    console.log(`Moderating video at ${videoStoragePath}`);
    return { isSafe: true };
};

const generateVideoSummary = async (videoStoragePath: string) => {
    console.log(`Generating summary for video at ${videoStoragePath}`);
    return 'This is a summary of the video.';
};

const generateVideoTitle = async (videoStoragePath: string) => {
    console.log(`Generating title for video at ${videoStoragePath}`);
    return 'This is a title for the video.';
};

export const createFlipFlow = ai.defineFlow(
    {
        name: 'createFlipFlow',
        inputSchema: z.object({
            feedId: z.string(),
            videoStoragePath: z.string(),
            title: z.string().optional(),
        }),
        outputSchema: z.object({ flipId: z.string() }),
    },
    async (data, { context }) => {
        if (!context?.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }

        const { uid, token } = context.auth;
        const { displayName, photoURL } = token;

        const { feedId, videoStoragePath, title } = data;

        const feedMemberRef = db.collection('feeds').doc(feedId).collection('members').doc(uid);
        const feedMemberDoc = await feedMemberRef.get();
        if (!feedMemberDoc.exists) {
            throw new HttpsError('permission-denied', 'User is not a member of this feed.');
        }

        const moderationResult = await moderateVideo(videoStoragePath);
        if (!moderationResult.isSafe) {
            throw new HttpsError('invalid-argument', 'Video is not safe.');
        }

        const summary = await generateVideoSummary(videoStoragePath);
        const generatedTitle = title ?? (await generateVideoTitle(videoStoragePath));

        const newFlipRef = db.collection('flips').doc();
        const flipId = newFlipRef.id;

        await db.runTransaction(async (transaction) => {
            transaction.set(newFlipRef, {
                feedId,
                authorId: uid,
                authorName: displayName,
                authorPhotoURL: photoURL,
                title: generatedTitle,
                summary,
                videoStoragePath,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const feedRef = db.collection('feeds').doc(feedId);
            transaction.update(feedRef, {
                'stats.flipCount': admin.firestore.FieldValue.increment(1),
            });
        });

        return { flipId };
    }
);
