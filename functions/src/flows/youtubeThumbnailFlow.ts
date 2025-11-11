import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
import { createThumbnailsTool } from '../tools/createThumbnailsTool';
import { getYouTubeChannelTool } from '../tools/getYouTubeChannelTool';
import { listLatestVideosTool } from '../tools/listLatestVideosTool';

/**
 * Main flow for YouTube thumbnail generation
 */
export const youtubeThumbnailFlow = () => {
    const ai = genkit({
        plugins: [googleAI()],
        model: 'googleai/gemini-2.0-flash-exp',
    });

    return ai.defineFlow(
        {
            name: 'youtubeThumbnailFlow',
            inputSchema: z.object({
                uid: z.string().describe('The authenticated user UID'),
                prompt: z.string().describe('User prompt for thumbnail generation'),
            }),
            outputSchema: z.object({
                success: z.boolean(),
                message: z.string(),
                data: z.any().optional(),
            }),
        },
        async ({ uid, prompt }) => {
            try {
                // Step 1: Get YouTube channel ID for the user
                const channelResult = await getYouTubeChannelTool({ uid });

                if (!channelResult.found || !channelResult.youtubeChannelId) {
                    return {
                        success: false,
                        message: 'No YouTube channel found for this user',
                    };
                }

                // Step 2: List latest videos from the channel
                const videosResult = await listLatestVideosTool({
                    channelId: channelResult.youtubeChannelId,
                    maxResults: 5,
                });

                if (videosResult.videos.length === 0) {
                    return {
                        success: false,
                        message: 'No videos found for this channel',
                    };
                }

                // Step 3: Generate thumbnails for the first video
                const firstVideo = videosResult.videos[0];
                const thumbnailsResult = await createThumbnailsTool({
                    videoId: firstVideo.videoId,
                    prompt,
                    videoTitle: firstVideo.title,
                });

                return {
                    success: true,
                    message: 'Thumbnails generated successfully',
                    data: {
                        channelId: channelResult.youtubeChannelId,
                        video: firstVideo,
                        thumbnails: thumbnailsResult.thumbnailIdeas,
                    },
                };
            } catch (error) {
                console.error('Error in youtubeThumbnailFlow:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                };
            }
        }
    );
};
