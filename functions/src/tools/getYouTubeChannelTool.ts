import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'genkit';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with Google AI plugin
const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash-exp',
});

/**
 * Tool to retrieve YouTube channel ID from Firestore based on user UID
 */
export const getYouTubeChannelTool = ai.defineTool(
    {
        name: 'getYouTubeChannel',
        description: 'Retrieves the YouTube channel ID for a given user UID from Firestore',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase user UID'),
        }),
        outputSchema: z.object({
            youtubeChannelId: z.string().optional(),
            found: z.boolean(),
        }),
    },
    async ({ uid }) => {
        try {
            const db = getFirestore();
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                return { found: false };
            }

            const userData = userDoc.data();
            const youtubeChannelId = userData?.youtubeChannelId;

            if (!youtubeChannelId) {
                return { found: false };
            }

            return {
                youtubeChannelId,
                found: true,
            };
        } catch (error) {
            console.error('Error fetching YouTube channel:', error);
            return { found: false };
        }
    }
);
