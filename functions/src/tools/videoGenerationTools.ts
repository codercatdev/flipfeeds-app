import { getFirestore } from 'firebase-admin/firestore';
import type { ActionContext, Genkit } from 'genkit';
import { z } from 'zod';
import type { FlipFeedsAuthContext } from '../auth/contextProvider';

/**
 * Get Firestore instance lazily
 */
const db = () => getFirestore();

// ============================================================================
// SCHEMAS
// ============================================================================

export const VideoGenerationJobSchema = z.object({
  jobId: z.string().describe('Unique job identifier'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).describe('Current job status'),
  prompt: z.string().describe('The prompt used to generate the video'),
  userId: z.string().describe('User who requested the generation'),
  aspectRatio: z.string().optional().describe('Video aspect ratio (e.g., 9:16)'),
  resolution: z.string().optional().describe('Video resolution'),
  operationId: z.string().optional().describe('Google AI operation ID for polling status'),
  lastCheckedAt: z
    .string()
    .optional()
    .describe('Last time operation was checked (for rate limiting)'),
  videoUrl: z.string().optional().describe('Temporary Google AI URL when completed'),
  storagePath: z.string().optional().describe('Firebase Storage path after upload'),
  publicUrl: z.string().optional().describe('Public Firebase Storage URL after upload'),
  error: z.string().optional().describe('Error message if failed'),
  createdAt: z.string().describe('Job creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  completedAt: z.string().optional().describe('Completion timestamp'),
});

export type VideoGenerationJob = z.infer<typeof VideoGenerationJobSchema>;

// ============================================================================
// TOOL IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Start a vertical video generation using Veo 3.1
 * Returns a job with operation info for tracking
 * 🔒 SECURE: Gets uid from context
 */
export async function generateVerticalVideoTool(
  input: {
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
  },
  { context }: { context?: ActionContext },
  ai?: Genkit
): Promise<{ jobId: string; operationName: string; status: string }> {
  console.log('[generateVerticalVideoTool] Starting video generation:', input.prompt);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Generate unique job ID
  const jobId = `veo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const timestamp = new Date().toISOString();

  if (!ai) {
    throw new Error('Genkit instance not provided');
  }

  try {
    // Start video generation using Genkit
    console.log('[generateVerticalVideoTool] Calling Genkit generate...');
    const { operation } = await ai.generate({
      model: 'googleai/veo-3.1-generate-preview',
      prompt: input.prompt,
      config: {
        aspectRatio: input.aspectRatio || '9:16',
        resolution: input.resolution || '720p',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Extract operation ID from the id field
    // Format: "models/veo-3.1-generate-preview/operations/a2ex4z61a5up"
    const operationId = (operation as any).id as string;

    console.log('[generateVerticalVideoTool] Operation created:', operationId);

    if (!operationId) {
      throw new Error(
        `No operation id found in operation object. Keys: ${Object.keys(operation).join(', ')}`
      );
    }

    // Create job document in Firestore
    // Store the operation ID for checking status later
    const jobData: Partial<VideoGenerationJob> = {
      jobId,
      userId: uid,
      status: 'processing',
      prompt: input.prompt,
      aspectRatio: input.aspectRatio || '9:16',
      resolution: input.resolution || '720p',
      operationId,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastCheckedAt: timestamp,
    };

    await db().collection('videoGenerationJobs').doc(jobId).set(jobData);
    console.log('[generateVerticalVideoTool] Job created:', jobId);

    return {
      jobId,
      operationName: operationId,
      status: 'processing',
    };
  } catch (error: any) {
    console.error('[generateVerticalVideoTool] Error:', error);

    // Create failed job document
    await db()
      .collection('videoGenerationJobs')
      .doc(jobId)
      .set({
        jobId,
        userId: uid,
        status: 'failed',
        prompt: input.prompt,
        error: error.message || 'Failed to start video generation',
        createdAt: timestamp,
        updatedAt: timestamp,
      });

    throw error;
  }
}

/**
 * Check the status of a video generation operation
 * Uses rate limiting via lastCheckedAt to avoid excessive polling (5 second minimum)
 * 🔒 SECURE: Only checks jobs owned by authenticated user
 */
export async function checkVideoGenerationTool(
  input: { jobId: string },
  { context }: { context?: ActionContext },
  ai?: Genkit
): Promise<VideoGenerationJob> {
  console.log('[checkVideoGenerationTool] Checking video generation status for job:', input.jobId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const jobDoc = await db().collection('videoGenerationJobs').doc(input.jobId).get();

  if (!jobDoc.exists) {
    throw new Error(`Video generation job ${input.jobId} not found`);
  }

  const jobData = jobDoc.data() as VideoGenerationJob;

  // Verify ownership
  if (jobData.userId !== uid) {
    throw new Error('Unauthorized: This job belongs to a different user');
  }

  // If not processing, return current state
  if (jobData.status !== 'processing') {
    console.log('[checkVideoGenerationTool] Job not processing, status:', jobData.status);
    return jobData;
  }

  // Rate limiting: Don't check if checked within last 5 seconds
  if (jobData.lastCheckedAt) {
    const lastChecked = new Date(jobData.lastCheckedAt).getTime();
    const now = Date.now();
    const timeSinceLastCheck = now - lastChecked;

    if (timeSinceLastCheck < 5000) {
      console.log(
        '[checkVideoGenerationTool] Rate limit: Last checked',
        timeSinceLastCheck,
        'ms ago'
      );
      return jobData;
    }
  }

  if (!jobData.operationId) {
    // Old jobs created before we stored the operation ID
    throw new Error(
      `This job is missing operation ID and cannot be checked. Please start a new video generation. Job ID: ${input.jobId}`
    );
  }

  if (!ai) {
    throw new Error('Genkit instance not provided');
  }

  try {
    console.log('[checkVideoGenerationTool] Checking operation:', jobData.operationId);

    // We need to poll the Google AI API directly since ai.checkOperation()
    // requires the original operation object which we can't store in Firestore
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Poll the operation status directly via Google AI API
    // Format: https://generativelanguage.googleapis.com/v1beta/{operationId}
    const operationUrl = `https://generativelanguage.googleapis.com/v1beta/${jobData.operationId}?key=${apiKey}`;

    console.log('[checkVideoGenerationTool] Polling operation URL');
    const response = await fetch(operationUrl);

    if (!response.ok) {
      throw new Error(`Failed to check operation: ${response.status} ${response.statusText}`);
    }

    const operation = await response.json();
    console.log(
      '[checkVideoGenerationTool] Operation response:',
      JSON.stringify(operation, null, 2)
    );

    // Update lastCheckedAt
    const updateData: any = {
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!operation.done) {
      console.log('[checkVideoGenerationTool] Operation still processing');
      await db().collection('videoGenerationJobs').doc(input.jobId).update(updateData);
      return { ...jobData, ...updateData };
    }

    // Operation is done - check for errors
    if (operation.error) {
      console.error('[checkVideoGenerationTool] Operation failed:', operation.error.message);
      updateData.status = 'failed';
      updateData.error = operation.error.message || 'Video generation failed';
      updateData.completedAt = new Date().toISOString();

      await db().collection('videoGenerationJobs').doc(input.jobId).update(updateData);
      return { ...jobData, ...updateData };
    }

    // Success - extract video URL from the response
    // Response structure: response.generateVideoResponse.generatedSamples[0].video.uri
    const videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (!videoUri) {
      throw new Error('Failed to find the generated video URI in operation response');
    }

    console.log('[checkVideoGenerationTool] Video ready at temp URL:', videoUri);
    updateData.status = 'completed';
    updateData.videoUrl = videoUri;
    updateData.completedAt = new Date().toISOString();

    await db().collection('videoGenerationJobs').doc(input.jobId).update(updateData);
    return { ...jobData, ...updateData };
  } catch (error: any) {
    console.error('[checkVideoGenerationTool] Error checking operation:', error);
    throw error;
  }
}

/**
 * Upload a completed video to Firebase Storage
 * Downloads from Google AI temp URL and uploads to permanent storage
 * 🔒 SECURE: Only uploads videos from jobs owned by authenticated user
 */
export async function uploadGeneratedVideoTool(
  input: { jobId: string },
  { context }: { context?: ActionContext }
): Promise<{ storagePath: string; publicUrl: string; flipReady: boolean }> {
  console.log('[uploadGeneratedVideoTool] Uploading video for job:', input.jobId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const jobDoc = await db().collection('videoGenerationJobs').doc(input.jobId).get();

  if (!jobDoc.exists) {
    throw new Error(`Video generation job ${input.jobId} not found`);
  }

  const jobData = jobDoc.data() as VideoGenerationJob;

  // Verify ownership
  if (jobData.userId !== uid) {
    throw new Error('Unauthorized: This job belongs to a different user');
  }

  // Check if already uploaded
  if (jobData.publicUrl && jobData.storagePath) {
    console.log('[uploadGeneratedVideoTool] Already uploaded:', jobData.publicUrl);
    return {
      storagePath: jobData.storagePath,
      publicUrl: jobData.publicUrl,
      flipReady: true,
    };
  }

  // Check if video is ready
  if (jobData.status !== 'completed' || !jobData.videoUrl) {
    throw new Error(`Video generation not completed yet. Status: ${jobData.status}`);
  }

  try {
    const { getStorage } = await import('firebase-admin/storage');
    const storage = getStorage();

    // Download from Google AI temp URL (add API key)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const downloadUrl = `${jobData.videoUrl}&key=${apiKey}`;
    console.log('[uploadGeneratedVideoTool] Downloading video...');

    const videoResponse = await fetch(downloadUrl);
    if (!videoResponse || videoResponse.status !== 200 || !videoResponse.body) {
      throw new Error('Failed to fetch video from Google AI');
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log('[uploadGeneratedVideoTool] Downloaded', videoBuffer.length, 'bytes');

    // Upload to Firebase Storage
    const videoId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const storagePath = `generated-videos/${uid}/${videoId}.mp4`;

    console.log('[uploadGeneratedVideoTool] Uploading to storage:', storagePath);
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          generatedBy: 'veo-3.1',
          prompt: jobData.prompt,
          userId: uid,
          jobId: input.jobId,
          generatedAt: jobData.completedAt || new Date().toISOString(),
        },
      },
    });

    await file.makePublic();

    // Determine if we're using emulator or production
    const isEmulator = !!(
      process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST
    );
    let publicUrl: string;

    if (isEmulator) {
      // Emulator format: http://localhost:9199/v0/b/{bucket}/o/{path}?alt=media
      // Encode each path segment, preserving slashes
      const emulatorHost =
        process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
        process.env.STORAGE_EMULATOR_HOST ||
        'localhost:9199';
      const encodedPath = storagePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('%2F');
      publicUrl = `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    } else {
      // Production format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
      const encodedPath = storagePath
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('%2F');
      publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    }

    console.log('[uploadGeneratedVideoTool] Upload complete:', publicUrl);
    console.log('[uploadGeneratedVideoTool] Storage path:', storagePath);
    console.log('[uploadGeneratedVideoTool] Environment:', isEmulator ? 'emulator' : 'production');

    // Update job with storage info
    await db().collection('videoGenerationJobs').doc(input.jobId).update({
      storagePath,
      publicUrl,
      updatedAt: new Date().toISOString(),
    });

    return {
      storagePath,
      publicUrl,
      flipReady: true,
    };
  } catch (error: any) {
    console.error('[uploadGeneratedVideoTool] Error uploading:', error);
    throw error;
  }
}

/**
 * Helper function to generate public URL from storage path
 * Handles both emulator and production environments
 */
export function getPublicUrlFromStoragePath(storagePath: string, bucketName?: string): string {
  const isEmulator = !!(
    process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST
  );
  const bucket =
    bucketName || process.env.FIREBASE_STORAGE_BUCKET || 'flipfeeds-app.firebasestorage.app';

  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('%2F');

  if (isEmulator) {
    // Emulator format: http://localhost:9199/v0/b/{bucket}/o/{path}?alt=media
    const emulatorHost =
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
      process.env.STORAGE_EMULATOR_HOST ||
      'localhost:9199';
    return `http://${emulatorHost}/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  } else {
    // Production format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }
}

/**
 * Generate public URL from storage path
 * Useful for updating flips with correct URLs
 */
export async function getPublicUrlTool(
  input: { storagePath: string },
  { context }: { context?: ActionContext }
): Promise<{ publicUrl: string }> {
  console.log('[getPublicUrlTool] Generating public URL for:', input.storagePath);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  try {
    const { getStorage } = await import('firebase-admin/storage');
    const storage = getStorage();
    const bucket = storage.bucket();

    const publicUrl = getPublicUrlFromStoragePath(input.storagePath, bucket.name);

    console.log('[getPublicUrlTool] Generated URL:', publicUrl);
    return { publicUrl };
  } catch (error: any) {
    console.error('[getPublicUrlTool] Error:', error);
    throw error;
  }
}

/**
 * List video generation jobs for a user
 * 🔒 SECURE: Only returns jobs owned by authenticated user
 */
export async function listVideoGenerationJobsTool(
  input: { limit?: number; status?: 'pending' | 'processing' | 'completed' | 'failed' },
  { context }: { context?: ActionContext }
): Promise<VideoGenerationJob[]> {
  console.log('[listVideoGenerationJobsTool] Listing jobs');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  let query = db().collection('videoGenerationJobs').where('userId', '==', uid);

  if (input.status) {
    query = query.where('status', '==', input.status);
  }

  query = query.orderBy('createdAt', 'desc').limit(input.limit || 20);

  const snapshot = await query.get();
  const jobs = snapshot.docs.map((doc) => doc.data() as VideoGenerationJob);

  console.log('[listVideoGenerationJobsTool] Found', jobs.length, 'jobs');
  return jobs;
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * Register all video generation tools with Genkit
 */
export function registerVideoGenerationTools(ai: Genkit) {
  /**
   * Generate vertical video (9:16) using Veo 3.1
   */
  ai.defineTool(
    {
      name: 'generateVerticalVideo',
      description:
        'Start generating a vertical format (9:16) video using Google Veo 3.1. Returns a job ID and operation name for tracking progress. The operation will run asynchronously.',
      inputSchema: z.object({
        prompt: z
          .string()
          .describe(
            'Detailed description of the video to generate. Be specific about visual elements, actions, style, and mood. Example: "A majestic dragon soaring over a mystical forest at dawn, cinematic lighting, fantasy style"'
          ),
        aspectRatio: z
          .string()
          .optional()
          .describe('Aspect ratio for the video (default: 9:16 for vertical/mobile format)'),
        resolution: z.string().optional().describe('Video resolution (default: 720p)'),
      }),
      outputSchema: z.object({
        jobId: z.string().describe('Unique job ID for tracking this generation'),
        operationName: z.string().describe('Google AI operation name for polling status'),
        status: z.string().describe('Initial status (processing)'),
      }),
    },
    async (input, { context }) => {
      return generateVerticalVideoTool(input, { context }, ai);
    }
  );

  /**
   * Check video generation status
   */
  ai.defineTool(
    {
      name: 'checkVideoGeneration',
      description:
        'Check the status of a video generation job. Polls the Google AI operation to see if the video is ready. Has built-in rate limiting (5 second minimum between checks). Call this periodically to monitor progress.',
      inputSchema: z.object({
        jobId: z.string().describe('The job ID returned from generateVerticalVideo'),
      }),
      outputSchema: VideoGenerationJobSchema,
    },
    async (input, { context }) => {
      return checkVideoGenerationTool(input, { context }, ai);
    }
  );

  /**
   * Upload generated video to Storage
   */
  ai.defineTool(
    {
      name: 'uploadGeneratedVideo',
      description:
        'Upload a completed generated video to Firebase Storage. Downloads from the temporary Google AI URL and uploads to permanent storage. Only works on completed jobs. Returns storagePath and publicUrl - ALWAYS use the returned storagePath when calling createFlip.',
      inputSchema: z.object({
        jobId: z.string().describe('The job ID of a completed video generation'),
      }),
      outputSchema: z.object({
        storagePath: z
          .string()
          .describe(
            'Firebase Storage path - use this EXACT value as videoStoragePath when calling createFlip'
          ),
        publicUrl: z
          .string()
          .describe(
            'Public URL to access the video - you can ignore this, createFlip will regenerate it from storagePath'
          ),
        flipReady: z.boolean().describe('Whether the video is ready to create a Flip'),
      }),
    },
    async (input, { context }) => {
      return uploadGeneratedVideoTool(input, { context });
    }
  );

  /**
   * List video generation jobs
   */
  ai.defineTool(
    {
      name: 'listVideoGenerationJobs',
      description:
        'List all video generation jobs for the authenticated user, optionally filtered by status. Useful for showing generation history or finding previous jobs.',
      inputSchema: z.object({
        limit: z.number().optional().describe('Maximum number of jobs to return (default: 20)'),
        status: z
          .enum(['pending', 'processing', 'completed', 'failed'])
          .optional()
          .describe('Filter by job status'),
      }),
      outputSchema: z.array(VideoGenerationJobSchema),
    },
    async (input, { context }) => {
      return listVideoGenerationJobsTool(input, { context });
    }
  );

  /**
   * Generate public URL from storage path
   */
  ai.defineTool(
    {
      name: 'getPublicUrl',
      description:
        'Generate a public URL from a Firebase Storage path. Automatically uses the correct format for emulator or production. Useful for updating flips with correct video URLs.',
      inputSchema: z.object({
        storagePath: z
          .string()
          .describe('Firebase Storage path (e.g., generated-videos/user-id/video.mp4)'),
      }),
      outputSchema: z.object({
        publicUrl: z.string().describe('Public URL for accessing the file'),
      }),
    },
    async (input, { context }) => {
      return getPublicUrlTool(input, { context });
    }
  );

  console.log('✅ Video generation tools registered');
}
