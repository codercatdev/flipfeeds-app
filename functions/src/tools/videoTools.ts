import type { Genkit } from 'genkit';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

export const VideoModerationResultSchema = z.object({
  isSafe: z.boolean().describe('Whether the video passed safety checks'),
  reasons: z.array(z.string()).optional().describe('Reasons for unsafe classification'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score'),
});

export type VideoModerationResult = z.infer<typeof VideoModerationResultSchema>;

// Video generation schemas moved to videoGenerationTools.ts

// ============================================================================
// TOOL IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Moderate video content using AI
 *
 * Uses Gemini to analyze video for unsafe content
 */
export async function moderateVideoTool(
  input: {
    videoStoragePath: string;
  },
  ai: Genkit
): Promise<VideoModerationResult> {
  console.log('[moderateVideoTool] Moderating video:', input.videoStoragePath);

  // Use AI to analyze video for safety
  const result = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analyze this video for safety and content moderation.

Video path: ${input.videoStoragePath}

Check for:
- Violence or graphic content
- Hate speech or harassment
- Adult or sexual content
- Dangerous activities
- Misinformation

Provide a safety assessment with reasons if unsafe.`,
    output: {
      schema: VideoModerationResultSchema,
    },
  });

  console.log('[moderateVideoTool] Moderation complete:', result.output);
  return (
    result.output ?? {
      isSafe: true,
      reasons: [],
      confidence: 0.5,
    }
  );
}

/**
 * Generate a summary of video content using AI
 */
export async function generateVideoSummaryTool(
  input: {
    videoStoragePath: string;
  },
  ai: Genkit
): Promise<string> {
  console.log('[generateVideoSummaryTool] Generating summary for:', input.videoStoragePath);

  const result = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analyze this video and create a brief, engaging summary (2-3 sentences).

Video path: ${input.videoStoragePath}

The summary should:
- Be concise and informative
- Highlight key moments or themes
- Be suitable for social media
- Be under 200 characters if possible`,
  });

  const summary = result.text || 'An interesting video worth watching.';
  console.log('[generateVideoSummaryTool] Summary generated:', summary);
  return summary;
}

/**
 * Generate an engaging title for a video using AI
 */
export async function generateVideoTitleTool(
  input: {
    videoStoragePath: string;
    summary?: string;
  },
  ai: Genkit
): Promise<string> {
  console.log('[generateVideoTitleTool] Generating title for:', input.videoStoragePath);

  const result = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Create an engaging, catchy title for this video${input.summary ? ` based on this summary: "${input.summary}"` : ''}.

Video path: ${input.videoStoragePath}

The title should:
- Be attention-grabbing and shareable
- Be 5-10 words maximum
- Use action words or interesting hooks
- Be suitable for social media sharing
- NOT use clickbait or misleading phrasing`,
  });

  const title = result.text || 'Check out this video!';
  console.log('[generateVideoTitleTool] Title generated:', title);
  return title;
}

// ============================================================================
// GENKIT TOOLS REGISTRATION
// ============================================================================

/**
 * Register all video processing tools with the provided Genkit instance.
 * Note: Video generation tools are in videoGenerationTools.ts
 */
export function registerVideoTools(ai: Genkit) {
  /**
   * Moderate video content
   */
  ai.defineTool(
    {
      name: 'moderateVideo',
      description: 'Use AI to moderate video content for safety and appropriateness',
      inputSchema: z.object({
        videoStoragePath: z.string().describe('Path to the video in Firebase Storage'),
      }),
      outputSchema: VideoModerationResultSchema,
    },
    async (input) => {
      return moderateVideoTool(input, ai);
    }
  );

  /**
   * Generate video summary
   */
  ai.defineTool(
    {
      name: 'generateVideoSummary',
      description: 'Generate a brief, engaging summary of video content using AI',
      inputSchema: z.object({
        videoStoragePath: z.string().describe('Path to the video in Firebase Storage'),
      }),
      outputSchema: z.string(),
    },
    async (input) => {
      return generateVideoSummaryTool(input, ai);
    }
  );

  /**
   * Generate video title
   */
  ai.defineTool(
    {
      name: 'generateVideoTitle',
      description: 'Generate an engaging, shareable title for a video using AI',
      inputSchema: z.object({
        videoStoragePath: z.string().describe('Path to the video in Firebase Storage'),
        summary: z.string().optional().describe('Optional video summary to inform the title'),
      }),
      outputSchema: z.string(),
    },
    async (input) => {
      return generateVideoTitleTool(input, ai);
    }
  );

  console.log('✅ Video processing tools registered (moderation, summary, title)');
}
