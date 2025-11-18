import type { Genkit } from 'genkit';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';

/**
 * Register the unified Flip Agent with the provided Genkit instance.
 */
export function registerFlipFlows(ai: Genkit) {
  /**
   * Unified Flip Agent
   *
   * An intelligent assistant that can handle ALL flip-related tasks:
   * - Create flips from existing videos
   * - Generate videos with AI (Veo 3.1) and create flips
   * - Check video generation status and complete workflow
   * - Browse and discover flips in feeds
   * - Manage user feeds and profiles
   * - Handle video moderation, summaries, and titles
   *
   * The agent has access to all necessary tools and will intelligently
   * choose the right ones based on the user's request.
   */
  const flipAgentAction = ai.defineFlow(
    {
      name: 'flipAgent',
      metadata: {
        description:
          'Unified intelligent assistant for all flip-related tasks: creating flips, generating videos, browsing content, managing feeds, and user profiles.',
      },
      inputSchema: z.object({
        request: z
          .string()
          .describe(
            'Natural language request describing what you want to do. Examples: "Create a flip from my video", "Generate a dragon video and share to family", "Check status of job veo_123", "Show me flips in my feed", "Get my profile"'
          ),
        // Optional context for specific operations
        videoStoragePath: z
          .string()
          .optional()
          .describe('Path to existing video in Firebase Storage (for creating flips)'),
        videoPrompt: z.string().optional().describe('Prompt for AI video generation'),
        feedIds: z.array(z.string()).optional().describe('Feed IDs to share to or browse'),
        jobId: z.string().optional().describe('Video generation job ID to check or resume'),
        title: z.string().optional().describe('Custom title for flip'),
        aspectRatio: z.string().optional().describe('Video aspect ratio (default: 9:16)'),
        resolution: z.string().optional().describe('Video resolution (default: 720p)'),
      }),
      outputSchema: z.object({
        success: z.boolean().describe('Whether the operation succeeded'),
        message: z.string().describe('Human-readable response message'),
        data: z
          .any()
          .optional()
          .describe(
            'Operation result data - could be flip, job info, flips list, profile, feeds, etc.'
          ),
      }),
    },
    async (data, { context }) => {
      const auth = requireAuth(context);

      try {
        console.log('[flipAgent] Processing request:', data.request);

        // Dynamically determine which tools to load based on request context
        const tools: string[] = [];

        // Always include core flip tools
        tools.push('createFlip', 'getFeedFlips', 'deleteFlip');

        // Add video processing tools if we have a video or are creating content
        if (data.videoStoragePath || data.videoPrompt || data.jobId) {
          tools.push('moderateVideo', 'generateVideoSummary', 'generateVideoTitle');
        }

        // Add video generation tools if generating or checking jobs
        if (data.videoPrompt || data.jobId) {
          tools.push(
            'generateVerticalVideo',
            'checkVideoGeneration',
            'uploadGeneratedVideo',
            'listVideoGenerationJobs'
          );
        }

        // Add feed tools if managing feeds or need feed context
        if (data.feedIds || data.request.toLowerCase().includes('feed')) {
          tools.push(
            'createFeed',
            'updateFeed',
            'deleteFeed',
            'getUserFeeds',
            'addFeedMember',
            'removeFeedMember',
            'getFeedMembers'
          );
        }

        // Add user tools if managing profile or username
        if (
          data.request.toLowerCase().includes('profile') ||
          data.request.toLowerCase().includes('username') ||
          data.request.toLowerCase().includes('user')
        ) {
          tools.push(
            'getUserProfile',
            'updateUserProfile',
            'checkUsernameAvailability',
            'reserveUsername'
          );
        }

        console.log('[flipAgent] Dynamically loaded tools:', tools);

        // The agent intelligently chooses tools based on the request
        const result = await ai.generate({
          model: 'googleai/gemini-2.5-flash',
          prompt: `You are an intelligent assistant helping user ${auth.uid} with flip-related tasks.

User Request: "${data.request}"

Available Context:
${data.videoStoragePath ? `- Video Storage Path: ${data.videoStoragePath}` : ''}
${data.videoPrompt ? `- Video Generation Prompt: ${data.videoPrompt}` : ''}
${data.feedIds ? `- Feed IDs: ${data.feedIds.join(', ')}` : ''}
${data.jobId ? `- Job ID: ${data.jobId}` : ''}
${data.title ? `- Title: ${data.title}` : ''}
${data.aspectRatio ? `- Aspect Ratio: ${data.aspectRatio}` : ''}
${data.resolution ? `- Resolution: ${data.resolution}` : ''}

You have access to ALL tools needed to complete this request:

USER TOOLS:
- getUserProfile: Get the current user's profile
- updateUserProfile: Update user profile (displayName, bio, etc.)
- checkUsernameAvailability: Check if a username is available
- reserveUsername: Reserve a username for the user

FEED TOOLS:
- createFeed: Create a new feed (e.g., "Family", "Friends")
- updateFeed: Update feed name or visibility
- deleteFeed: Delete a feed
- getUserFeeds: Get all feeds owned by user
- addFeedMember: Add someone to a feed
- removeFeedMember: Remove someone from a feed
- getFeedMembers: Get members of a feed

FLIP TOOLS (Video Posts):
- createFlip: Create a flip from an existing video
- getFeedFlips: Browse flips in a feed
- deleteFlip: Delete a flip

VIDEO PROCESSING TOOLS:
- moderateVideo: Check video for safety/content moderation
- generateVideoSummary: Create AI summary of video
- generateVideoTitle: Generate engaging title for video

VIDEO GENERATION TOOLS (AI):
- generateVerticalVideo: Start AI video generation (returns jobId)
- checkVideoGeneration: Check status of video generation job
- uploadGeneratedVideo: Upload completed video to storage
- listVideoGenerationJobs: List user's video generation jobs

INTELLIGENT WORKFLOW PATTERNS:

1. CREATE FLIP FROM EXISTING VIDEO:
   - moderateVideo → generateVideoSummary → generateVideoTitle → createFlip

2. GENERATE VIDEO AND CREATE FLIP:
   - generateVerticalVideo (returns jobId)
   - Tell user to check back later with the jobId
   - When they return: checkVideoGeneration → uploadGeneratedVideo → (then pattern 1)

3. RESUME VIDEO GENERATION:
   - checkVideoGeneration with jobId
   - If completed: uploadGeneratedVideo → createFlip workflow
   - If still processing: tell user to check back later

4. BROWSE CONTENT:
   - getFeedFlips to show videos in a feed

5. MANAGE USER:
   - getUserProfile, updateUserProfile, etc.

6. MANAGE FEEDS:
   - getUserFeeds, createFeed, addFeedMember, etc.

IMPORTANT GUIDELINES:
- Always check video generation status before trying to upload
- Always moderate videos before creating flips
- Auto-generate summaries and titles if not provided
- Return clear, actionable messages to the user
- Include relevant data in your response (flip IDs, job IDs, etc.)
- If operation is async (video generation), explain next steps clearly

Analyze the request and use the appropriate tools to complete it. Return a clear success message and relevant data.`,
          tools, // Dynamically loaded tools based on request context
          output: {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.any().optional(),
            }),
          },
        });

        console.log('[flipAgent] Operation completed:', result.output?.success);

        return {
          success: result.output?.success ?? false,
          message: result.output?.message ?? 'Operation completed',
          data: result.output?.data,
        };
      } catch (error: any) {
        console.error('[flipAgent] Error:', error);
        return {
          success: false,
          message: `Error: ${error.message || 'An unexpected error occurred'}`,
        };
      }
    }
  );

  return {
    flipAgentAction,
  };
}
