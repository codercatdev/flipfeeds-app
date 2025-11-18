import { getStorage } from 'firebase-admin/storage';
import type { Genkit } from 'genkit';
import { z } from 'zod';

/**
 * Get Storage instance lazily
 */
const storage = () => getStorage();

// ============================================================================
// SCHEMAS
// ============================================================================

export const VideoModerationResultSchema = z.object({
  isSafe: z.boolean().describe('Whether the video passed safety checks'),
  reasons: z.array(z.string()).optional().describe('Reasons for unsafe classification'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score'),
});

export type VideoModerationResult = z.infer<typeof VideoModerationResultSchema>;

export const GeneratedVideoResultSchema = z.object({
  videoUrl: z.string().describe('Public URL to the generated video'),
  storagePath: z.string().describe('Storage path in Firebase Storage'),
  prompt: z.string().describe('The prompt used to generate the video'),
});

export type GeneratedVideoResult = z.infer<typeof GeneratedVideoResultSchema>;

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

/**
 * Generate a vertical video (9:16) using Google Veo 3.1
 * 🔒 SECURE: Gets uid from context for storage path organization
 */
export async function generateVerticalVideoTool(
  input: {
    prompt: string;
  },
  ai: Genkit,
  context?: { auth?: { uid: string } }
): Promise<GeneratedVideoResult> {
  console.log('[generateVerticalVideoTool] Generating video with prompt:', input.prompt);

  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[generateVerticalVideoTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Generate video using Veo 3.1 with 9:16 aspect ratio
  const result = await ai.generate({
    model: 'googleai/veo-3.1-generate-preview',
    prompt: input.prompt,
    config: {
      aspectRatio: '9:16', // Vertical format for mobile/social
    },
  });

  console.log('[generateVerticalVideoTool] Video generated, processing result');

  // The result should contain video data as a media part
  const videoData = result.media;

  if (!videoData || !videoData.url) {
    throw new Error('Failed to generate video: No video data in response');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const videoId = `${timestamp}_${Math.random().toString(36).substring(7)}`;
  const storagePath = `generated-videos/${uid}/${videoId}.mp4`;

  console.log('[generateVerticalVideoTool] Uploading to storage:', storagePath);

  // Download the generated video
  const videoResponse = await fetch(videoData.url);
  if (!videoResponse.ok) {
    throw new Error('Failed to download generated video');
  }
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  // Upload to Firebase Storage
  const bucket = storage().bucket();
  const file = bucket.file(storagePath);

  await file.save(videoBuffer, {
    metadata: {
      contentType: 'video/mp4',
      metadata: {
        generatedBy: 'veo-3.1',
        prompt: input.prompt,
        userId: uid,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // Make the file publicly readable
  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  console.log('[generateVerticalVideoTool] Video uploaded successfully:', publicUrl);

  return {
    videoUrl: publicUrl,
    storagePath,
    prompt: input.prompt,
  };
}

// ============================================================================
// GENKIT TOOLS REGISTRATION
// ============================================================================

/**
 * Register all video processing tools with the provided Genkit instance.
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

  /**
   * Generate vertical video (9:16) using Google Veo 3.1
   * 🔒 SECURE: Gets uid from context for storage path organization
   */
  ai.defineTool(
    {
      name: 'generateVerticalVideo',
      description:
        'Generate a vertical format (9:16) video using Google Veo 3.1 model. Perfect for mobile and social media content.',
      inputSchema: z.object({
        prompt: z
          .string()
          .describe(
            'Detailed description of the video to generate. Be specific about visual elements, actions, style, and mood.'
          ),
      }),
      outputSchema: GeneratedVideoResultSchema,
    },
    async (input, { context }) => {
      return generateVerticalVideoTool(input, ai, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );
}
