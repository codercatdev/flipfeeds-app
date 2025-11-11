import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

// Initialize Genkit with Google AI plugin
const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.0-flash-exp',
});

/**
 * Placeholder tool for listing latest videos
 */
export const listLatestVideosTool = ai.defineTool(
    {
        name: 'listLatestVideos',
        description: 'Lists the latest videos from a YouTube channel',
        inputSchema: z.object({
            channelId: z.string().describe('The YouTube channel ID'),
            maxResults: z.number().default(10).describe('Maximum number of videos to return'),
        }),
        outputSchema: z.object({
            videos: z.array(
                z.object({
                    videoId: z.string(),
                    title: z.string(),
                    description: z.string(),
                    publishedAt: z.string(),
                })
            ),
        }),
    },
    async ({ channelId, maxResults }) => {
        // Placeholder implementation
        // In production, this would call YouTube Data API
        console.log(`Fetching ${maxResults} videos for channel: ${channelId}`);

        return {
            videos: [
                {
                    videoId: 'placeholder-video-1',
                    title: 'Sample Video 1',
                    description: 'This is a placeholder video',
                    publishedAt: new Date().toISOString(),
                },
            ],
        };
    }
);
