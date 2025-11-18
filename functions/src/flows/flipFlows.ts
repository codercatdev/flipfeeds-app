import type { Genkit } from 'genkit';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';
import { FlipSchema } from '../tools/flipTools';

/**
 * Register all flip agents with the provided Genkit instance.
 */
export function registerFlipFlows(ai: Genkit) {
  /**
   * Flip Creation Agent (Video Publishing)
   *
   * Handles video publishing with AI-powered moderation, summary, and title generation.
   * Now supports AI video generation using Veo 3.1!
   *
   * Workflow:
   * - With existing video: moderate → generate summary → generate title → create flip
   * - With prompt: generate video → moderate → generate summary → generate title → create flip
   */
  const flipCreationAgentAction = ai.defineFlow(
    {
      name: 'flipCreationAgent',
      metadata: {
        description:
          'An intelligent assistant for creating video posts. Can use existing videos or generate new ones from text prompts using AI.',
      },
      inputSchema: z.object({
        feedIds: z.array(z.string()).min(1).describe('Array of feed IDs to share to'),
        videoStoragePath: z
          .string()
          .optional()
          .describe('Path to existing video in Firebase Storage (OR use videoPrompt)'),
        videoPrompt: z
          .string()
          .optional()
          .describe(
            'Text prompt to generate a video using AI (OR use videoStoragePath). Creates vertical 9:16 video.'
          ),
        videoDuration: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe('Duration in seconds for generated video (1-10, default 5)'),
        title: z.string().optional().describe('Optional title (will be generated if not provided)'),
      }),
      outputSchema: z.object({
        flipId: z.string(),
        title: z.string(),
        summary: z.string(),
        videoStoragePath: z.string().describe('Path to the video (generated or provided)'),
        wasGenerated: z.boolean().describe('Whether the video was AI-generated'),
        moderationResult: z.object({
          isSafe: z.boolean(),
          reasons: z.array(z.string()).optional(),
        }),
      }),
    },
    async (data, { context }) => {
      const auth = requireAuth(context);

      const { feedIds, videoStoragePath, videoPrompt, videoDuration, title } = data;

      // Validate input: must have either videoStoragePath OR videoPrompt
      if (!videoStoragePath && !videoPrompt) {
        throw new Error(
          'Must provide either videoStoragePath (existing video) or videoPrompt (generate new video)'
        );
      }
      if (videoStoragePath && videoPrompt) {
        throw new Error('Cannot provide both videoStoragePath and videoPrompt. Choose one.');
      }

      // Use ai.generate() with tools to handle the entire flip creation workflow
      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `Create a new flip (video post) for user ${auth.uid}.

${
  videoPrompt
    ? `STEP 1 - GENERATE VIDEO:
Use generateVerticalVideo tool to create a vertical (9:16) video from this prompt:
"${videoPrompt}"
${videoDuration ? `Duration: ${videoDuration} seconds` : 'Duration: 5 seconds (default)'}

The tool will return videoUrl and storagePath. Use the storagePath for the next steps.

`
    : `Video already exists at: ${videoStoragePath}

`
}WORKFLOW:
1. ${videoPrompt ? 'After generating video, moderate it' : 'Moderate the video'} using moderateVideo tool
2. If video is not safe, stop and return the moderation result with isSafe: false
3. If video is safe, generate a summary using generateVideoSummary tool
4. If no title was provided, generate an engaging title using generateVideoTitle tool (pass the summary to it)
5. Create the flip using createFlip tool with:
   - feedIds: ${feedIds.join(', ')}
   - videoStoragePath: ${videoPrompt ? 'the storagePath from generated video' : videoStoragePath}
   - title: ${title || 'the generated title'}
   - summary: the generated summary

Return:
- flipId: The created flip ID
- title: The final title (generated or provided)
- summary: The generated summary
- videoStoragePath: Path to the video (${videoPrompt ? 'generated' : 'provided'})
- wasGenerated: ${videoPrompt ? 'true' : 'false'}
- moderationResult: The moderation result with isSafe and optional reasons`,
        tools: [
          ...(videoPrompt ? ['generateVerticalVideo'] : []),
          'moderateVideo',
          'generateVideoSummary',
          'generateVideoTitle',
          'createFlip',
        ],
        output: {
          schema: z.object({
            flipId: z.string(),
            title: z.string(),
            summary: z.string(),
            videoStoragePath: z.string(),
            wasGenerated: z.boolean(),
            moderationResult: z.object({
              isSafe: z.boolean(),
              reasons: z.array(z.string()).optional(),
            }),
          }),
        },
      });

      if (!result.output?.moderationResult.isSafe) {
        throw new Error(
          `Video failed moderation: ${result.output?.moderationResult.reasons?.join(', ') || 'Unknown reasons'}`
        );
      }

      return {
        flipId: result.output?.flipId ?? '',
        title: result.output?.title ?? '',
        summary: result.output?.summary ?? '',
        videoStoragePath: result.output?.videoStoragePath ?? videoStoragePath ?? '',
        wasGenerated: !!videoPrompt,
        moderationResult: result.output?.moderationResult ?? { isSafe: false },
      };
    }
  );

  /**
   * Flip Browser Agent
   *
   * Manages browsing and discovering flips in feeds.
   */
  const flipBrowserAgentAction = ai.defineFlow(
    {
      name: 'flipBrowserAgent',
      metadata: {
        description: 'An intelligent assistant for browsing and discovering video content in feeds',
      },
      inputSchema: z.object({
        feedId: z.string(),
        limit: z.number().min(1).max(100).optional(),
      }),
      outputSchema: z.object({
        flips: z.array(FlipSchema),
      }),
    },
    async (data, { context }) => {
      requireAuth(context);

      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt: `Get flips for feed ${data.feedId}.

Use the getFeedFlips tool to retrieve the flips${data.limit ? ` with a limit of ${data.limit}` : ''}.

Return the list of flips.`,
        tools: ['getFeedFlips'],
        output: {
          schema: z.object({ flips: z.array(FlipSchema) }),
        },
      });

      return { flips: result.output?.flips ?? [] };
    }
  );

  return {
    flipCreationAgentAction,
    flipBrowserAgentAction,
  };
}
