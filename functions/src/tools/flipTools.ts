import { FieldValue, getFirestore } from 'firebase-admin/firestore';
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

export const FlipSchema = z.object({
  id: z.string(),
  feedIds: z.array(z.string()).describe('Array of feed IDs this flip is shared to'),
  authorId: z.string(),
  authorName: z.string().optional(),
  authorPhotoURL: z.string().url().optional(),
  title: z.string(),
  summary: z.string().optional(),
  videoStoragePath: z.string(),
  publicUrl: z.string().url().optional().describe('Public URL of the video'),
  createdAt: z.string(),
});

export type Flip = z.infer<typeof FlipSchema>;

// ============================================================================
// TOOL IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Create a new flip (video post)
 * 🔒 SECURE: User must be a member of the feed to create a flip
 *
 * Firestore Rules: allow create if isAuthenticated() && isValidFlipData()
 * This tool uses admin SDK for moderation and AI processing
 */
export async function createFlipTool(
  input: {
    feedIds: string[];
    videoStoragePath: string;
    title: string;
    summary?: string;
    publicUrl?: string;
  },
  { context }: { context?: ActionContext }
): Promise<{ flipId: string }> {
  console.log('[createFlipTool] Creating flip');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const { feedIds, videoStoragePath, title, summary, publicUrl } = input;
  const { displayName, photoURL } = auth || {};

  // Verify user is a member of all feeds
  for (const feedId of feedIds) {
    const memberDoc = await db()
      .collection('feeds')
      .doc(feedId)
      .collection('members')
      .doc(uid)
      .get();

    if (!memberDoc.exists) {
      throw new Error(`Unauthorized: Not a member of feed ${feedId}`);
    }
  }

  const newFlipRef = db().collection('flips').doc();
  const flipId = newFlipRef.id;

  await db().runTransaction(async (transaction) => {
    // Create flip document
    transaction.set(newFlipRef, {
      feedIds,
      authorId: uid,
      authorName: displayName || 'Anonymous',
      authorPhotoURL: photoURL || null,
      title,
      summary: summary || null,
      videoStoragePath,
      publicUrl: publicUrl || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment flip count for all feeds
    for (const feedId of feedIds) {
      const feedRef = db().collection('feeds').doc(feedId);
      transaction.update(feedRef, {
        'stats.flipCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  console.log(`[createFlipTool] Created flip ${flipId}`);
  return { flipId };
}

/**
 * Get a flip by ID
 * 🔒 SECURE: User must be a member of at least one feed the flip is shared to
 */
export async function getFlipTool(
  input: { flipId: string },
  { context }: { context?: ActionContext }
): Promise<Flip | null> {
  console.log('[getFlipTool] Getting flip:', input.flipId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const flipDoc = await db().collection('flips').doc(input.flipId).get();

  if (!flipDoc.exists) {
    console.log('[getFlipTool] Flip not found');
    return null;
  }

  const data = flipDoc.data();
  if (!data) return null;

  const feedIds = data.feedIds || [];

  // Check if user is a member of at least one feed
  let isMember = false;
  for (const feedId of feedIds) {
    const memberDoc = await db()
      .collection('feeds')
      .doc(feedId)
      .collection('members')
      .doc(uid)
      .get();

    if (memberDoc.exists) {
      isMember = true;
      break;
    }
  }

  if (!isMember) {
    throw new Error('Unauthorized: Not a member of any feeds this flip is shared to');
  }

  const flip: Flip = {
    id: flipDoc.id,
    feedIds,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL,
    title: data.title,
    summary: data.summary,
    videoStoragePath: data.videoStoragePath,
    createdAt: (data.createdAt?.toDate() || new Date()).toISOString(),
  };

  console.log('[getFlipTool] Flip fetched successfully');
  return flip;
}

/**
 * List flips for a specific feed
 * 🔒 SECURE: User must be a member of the feed
 */
export async function getFeedFlipsTool(
  input: {
    feedId: string;
    limit?: number;
  },
  { context }: { context?: ActionContext }
): Promise<{ flips: Flip[] }> {
  console.log('[getFeedFlipsTool] Fetching flips for feed:', input.feedId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Verify user is a member of the feed
  const memberDoc = await db()
    .collection('feeds')
    .doc(input.feedId)
    .collection('members')
    .doc(uid)
    .get();

  if (!memberDoc.exists) {
    throw new Error('Unauthorized: Not a member of this feed');
  }

  // Query flips that include this feedId
  const limit = Math.min(input.limit || 50, 100); // Max 100
  const flipsSnapshot = await db()
    .collection('flips')
    .where('feedIds', 'array-contains', input.feedId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const flips: Flip[] = flipsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      feedIds: data.feedIds || [],
      authorId: data.authorId,
      authorName: data.authorName,
      authorPhotoURL: data.authorPhotoURL,
      title: data.title,
      summary: data.summary,
      videoStoragePath: data.videoStoragePath,
      createdAt: (data.createdAt?.toDate() || new Date()).toISOString(),
    };
  });

  console.log(`[getFeedFlipsTool] Found ${flips.length} flips`);
  return { flips };
}

/**
 * Update a flip
 * 🔒 SECURE: Only the author can update
 */
export async function updateFlipTool(
  input: {
    flipId: string;
    title?: string;
    summary?: string;
    publicUrl?: string;
  },
  { context }: { context?: ActionContext }
): Promise<{ success: boolean }> {
  console.log('[updateFlipTool] Updating flip:', input.flipId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const flipDoc = await db().collection('flips').doc(input.flipId).get();

  if (!flipDoc.exists) {
    throw new Error('Flip not found');
  }

  const data = flipDoc.data();
  if (!data) {
    throw new Error('Flip data not found');
  }

  // Check if user is the author
  if (data.authorId !== uid) {
    throw new Error('Unauthorized: Only the author can update this flip');
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.title !== undefined) {
    updates.title = input.title;
  }

  if (input.summary !== undefined) {
    updates.summary = input.summary;
  }

  if (input.publicUrl !== undefined) {
    updates.publicUrl = input.publicUrl;
  }

  await db().collection('flips').doc(input.flipId).update(updates);

  console.log(`[updateFlipTool] Updated flip ${input.flipId}`);
  return { success: true };
}

/**
 * Delete a flip
 * 🔒 SECURE: Only the author or feed admin can delete
 */
export async function deleteFlipTool(
  input: { flipId: string },
  { context }: { context?: ActionContext }
): Promise<{ success: boolean }> {
  console.log('[deleteFlipTool] Deleting flip:', input.flipId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const flipDoc = await db().collection('flips').doc(input.flipId).get();

  if (!flipDoc.exists) {
    throw new Error('Flip not found');
  }

  const data = flipDoc.data();
  if (!data) {
    throw new Error('Flip data not found');
  }

  // Check if user is the author
  const isAuthor = data.authorId === uid;

  // If not author, check if user is admin of any feed
  let isAdmin = false;
  if (!isAuthor) {
    for (const feedId of data.feedIds || []) {
      const memberDoc = await db()
        .collection('feeds')
        .doc(feedId)
        .collection('members')
        .doc(uid)
        .get();

      if (memberDoc.exists && memberDoc.data()?.role === 'admin') {
        isAdmin = true;
        break;
      }
    }
  }

  if (!isAuthor && !isAdmin) {
    throw new Error('Unauthorized: Only the author or feed admin can delete this flip');
  }

  await db().runTransaction(async (transaction) => {
    // Delete flip
    transaction.delete(db().collection('flips').doc(input.flipId));

    // Decrement flip count for all feeds
    for (const feedId of data.feedIds || []) {
      const feedRef = db().collection('feeds').doc(feedId);
      transaction.update(feedRef, {
        'stats.flipCount': FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  console.log(`[deleteFlipTool] Deleted flip ${input.flipId}`);
  return { success: true };
}

// ============================================================================
// GENKIT TOOLS REGISTRATION
// ============================================================================

/**
 * Register all flip management tools with the provided Genkit instance.
 */
export function registerFlipTools(ai: Genkit) {
  /**
   * Create a new flip
   */
  ai.defineTool(
    {
      name: 'createFlip',
      description: 'Create a new flip (video post) in one or more feeds',
      inputSchema: z.object({
        feedIds: z.array(z.string()).min(1).describe('Array of feed IDs to share this flip to'),
        videoStoragePath: z.string().describe('Path to the video in Firebase Storage'),
        title: z.string().min(1).max(200).describe('Video title'),
        summary: z.string().max(500).optional().describe('Optional video summary'),
        publicUrl: z
          .string()
          .url()
          .optional()
          .describe('Public URL of the video (use publicUrl from uploadGeneratedVideo)'),
      }),
      outputSchema: z.object({ flipId: z.string() }),
    },
    async (input, { context }) => {
      return createFlipTool(input, { context });
    }
  );

  /**
   * Get a flip by ID
   */
  ai.defineTool(
    {
      name: 'getFlip',
      description: 'Get a flip by ID (requires membership in at least one feed)',
      inputSchema: z.object({
        flipId: z.string().describe('The flip ID to retrieve'),
      }),
      outputSchema: FlipSchema.nullable(),
    },
    async (input, { context }) => {
      return getFlipTool(input, { context });
    }
  );

  /**
   * List flips for a feed
   */
  ai.defineTool(
    {
      name: 'getFeedFlips',
      description: 'Get flips for a specific feed (requires feed membership)',
      inputSchema: z.object({
        feedId: z.string().describe('The feed ID'),
        limit: z.number().min(1).max(100).optional().describe('Max number of flips to return'),
      }),
      outputSchema: z.object({ flips: z.array(FlipSchema) }),
    },
    async (input, { context }) => {
      return getFeedFlipsTool(input, { context });
    }
  );

  /**
   * Update a flip
   */
  ai.defineTool(
    {
      name: 'updateFlip',
      description: 'Update a flip title, summary, or public video URL (author only)',
      inputSchema: z.object({
        flipId: z.string().describe('The flip ID to update'),
        title: z.string().min(1).max(200).optional().describe('New video title'),
        summary: z.string().max(500).optional().describe('New video summary'),
        publicUrl: z
          .string()
          .url()
          .optional()
          .describe('Public URL of the video generated from videoStoragePath'),
      }),
      outputSchema: z.object({ success: z.boolean() }),
    },
    async (input, { context }) => {
      return updateFlipTool(input, { context });
    }
  );

  /**
   * Delete a flip
   */
  ai.defineTool(
    {
      name: 'deleteFlip',
      description: 'Delete a flip (author or feed admin only)',
      inputSchema: z.object({
        flipId: z.string().describe('The flip ID to delete'),
      }),
      outputSchema: z.object({ success: z.boolean() }),
    },
    async (input, { context }) => {
      return deleteFlipTool(input, { context });
    }
  );
}
