import {
  buildMultimodalPrompt,
  formatHistoryForPrompt,
} from '@flip-feeds/shared-logic/utils/conversationHistory';
import type { Genkit } from 'genkit';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';
import { getTools } from '../genkit';
import {
  initializeConversation,
  loadConversationHistory,
  saveMessageToHistory,
} from '../utils/conversationHistory'; /**
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
        // Multimodal inputs for vision analysis
        imageUrls: z
          .array(z.string().url())
          .nullable()
          .default([])
          .describe('URLs or data URIs of images to analyze (enables vision capabilities)'),
        videoUrls: z
          .array(z.string().url())
          .nullable()
          .default([])
          .describe('URLs or data URIs of videos to analyze'),
        // Conversation context
        conversationId: z
          .string()
          .optional()
          .describe('Conversation ID for maintaining context across multiple requests'),
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

        // Initialize conversation if needed
        const conversationId = data.conversationId || `conv_${Date.now()}`;
        if (!data.conversationId) {
          await initializeConversation(auth.uid, conversationId, 'Flip Agent Conversation');
        }

        // Load conversation history for context
        const history = await loadConversationHistory(auth.uid, conversationId, 10);
        const historyContext = formatHistoryForPrompt(history, {
          maxMessages: 10,
          maxTokens: 4096,
        });

        // Save user message to history
        await saveMessageToHistory(auth.uid, conversationId, {
          role: 'user',
          content: data.request,
          timestamp: new Date(),
          imageUrls: data.imageUrls || undefined,
          videoUrls: data.videoUrls || undefined,
        });

        // Load ALL available tools - this is a unified agent
        const toolNames: string[] = [
          // Flip tools
          'createFlip',
          'getFlip',
          'getFeedFlips',
          'deleteFlip',
          'updateFlip',
          // Feed tools
          'createFeed',
          'getFeed',
          'listUserFeeds',
          'addMemberToFeed',
          'removeMemberFromFeed',
          // User tools
          'getUserProfile',
          'getUserFeeds',
          'isUsernameAvailable',
          'claimUsername',
          'releaseUsername',
          'updateUserProfile',
          'createUserProfile',
          'addUsernameHistory',
          'generateProfileImageUploadUrl',
          'deleteProfileImage',
          // Video processing tools
          // 'moderateVideo',
          // 'generateVideoSummary',
          // 'generateVideoTitle',
          // Video generation tools
          'generateVerticalVideo',
          'checkVideoGeneration',
          'uploadGeneratedVideo',
          'listVideoGenerationJobs',
          'getPublicUrl',
        ];

        // Use getTools helper for consistent tool loading
        const tools = await getTools(toolNames);
        console.log('[flipAgent] Loaded', tools.length, 'tools for unified agent');

        // Build the base prompt text
        const basePrompt = `You are an intelligent assistant helping user ${auth.uid} with flip-related tasks.

User Request: "${data.request}"

Available Context:
${data.videoStoragePath ? `- Video Storage Path: ${data.videoStoragePath}` : ''}
${data.videoPrompt ? `- Video Generation Prompt: ${data.videoPrompt}` : ''}
${data.feedIds ? `- Feed IDs: ${data.feedIds.join(', ')}` : ''}
${data.jobId ? `- Job ID: ${data.jobId}` : ''}
${data.title ? `- Title: ${data.title}` : ''}
${data.aspectRatio ? `- Aspect Ratio: ${data.aspectRatio}` : ''}
${data.resolution ? `- Resolution: ${data.resolution}` : ''}
${data.imageUrls && data.imageUrls.length > 0 ? `- Images Provided: ${data.imageUrls.length} image(s) attached for analysis` : ''}
${data.videoUrls && data.videoUrls.length > 0 ? `- Videos Provided: ${data.videoUrls.length} video(s) attached for analysis` : ''}

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

CRITICAL: When creating a flip after uploadGeneratedVideo:
- ALWAYS pass the publicUrl from uploadGeneratedVideo result as publicUrl to createFlip
- ALWAYS pass the storagePath from uploadGeneratedVideo as videoStoragePath to createFlip
- Example: after uploadGeneratedVideo returns {storagePath, publicUrl}, call createFlip with:
  videoStoragePath: storagePath, publicUrl: publicUrl

4. BROWSE CONTENT:
   - getFeedFlips to show videos in a feed

5. MANAGE USER:
   - getUserProfile, updateUserProfile, etc.

6. MANAGE FEEDS:
   - getUserFeeds, createFeed, addFeedMember, etc.

7. IMAGE/VIDEO ANALYSIS (VISION):
   - If images or videos are provided, use your vision capabilities to analyze them
   - Describe what you see and suggest actions (e.g., "generate a flip based on this", "create a video similar to this")
   - Use the visual context to enhance flip creation and video generation

IMPORTANT GUIDELINES:
- Always check video generation status before trying to upload
- Always moderate videos before creating flips
- Auto-generate summaries and titles if not provided
- Return clear, actionable messages to the user
- Include relevant data in your response (flip IDs, job IDs, etc.)
- If operation is async (video generation), explain next steps clearly
- If images/videos are provided, analyze them and incorporate insights into your response

Analyze the request and use the appropriate tools to complete it.

After completing the task, provide a clear summary in natural language explaining:
1. What actions were taken
2. Whether the operation succeeded
3. Any important details or next steps

Your response should be conversational and helpful.${historyContext}`;

        // Build multimodal prompt with media context
        const fullPrompt = buildMultimodalPrompt(
          basePrompt,
          data.imageUrls || undefined,
          data.videoUrls || undefined
        );

        // The agent intelligently chooses tools based on the request
        const result = await ai.generate({
          model: 'googleai/gemini-2.5-flash', // Supports vision
          prompt: fullPrompt,
          tools, // Dynamically loaded tools based on request context
        });

        console.log('[flipAgent] Raw result:', JSON.stringify(result, null, 2));

        // Extract the response text from the AI
        const responseText = result.text || 'Operation completed';

        // Try to determine success based on the response and tool calls
        const hasError =
          responseText.toLowerCase().includes('error') ||
          responseText.toLowerCase().includes('failed');

        console.log('[flipAgent] Response:', responseText);
        console.log('[flipAgent] Success:', !hasError);

        // Save assistant response to history
        await saveMessageToHistory(auth.uid, conversationId, {
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        });

        // Return structured response
        return {
          success: !hasError,
          message: responseText,
          data: {
            toolCalls: result.toolRequests?.length || 0,
            conversationId,
          },
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
