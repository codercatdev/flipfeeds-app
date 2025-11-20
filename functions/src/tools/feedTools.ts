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

export const FeedSchema = z.object({
  id: z.string(),
  owner: z.string(),
  name: z.string(),
  description: z.string(),
  visibility: z.enum(['public', 'private']),
  stats: z.object({
    memberCount: z.number(),
    flipCount: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Feed = z.infer<typeof FeedSchema>;

export const FeedMemberSchema = z.object({
  uid: z.string(),
  role: z.enum(['admin', 'moderator', 'member']),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  joinedAt: z.string(),
});

export type FeedMember = z.infer<typeof FeedMemberSchema>;

// ============================================================================
// TOOL IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Create a new feed
 * 🔒 SECURE: Only authenticated users can create feeds, they become the owner
 *
 * Firestore Rules: Feed creation is allowed via backend flows only (allow create: if false)
 * This tool bypasses client rules by using admin SDK
 */
export async function createFeedTool(
  input: {
    name: string;
    description: string;
    visibility: 'public' | 'private';
  },
  { context }: { context?: ActionContext }
): Promise<{ feedId: string }> {
  console.log('[createFeedTool] Starting');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const { name, description, visibility } = input;
  const { displayName, photoURL } = auth || {};

  const newFeedRef = db().collection('feeds').doc();
  const feedId = newFeedRef.id;

  await db().runTransaction(async (transaction) => {
    // Create feed document
    transaction.set(newFeedRef, {
      owner: uid,
      name,
      description,
      visibility,
      stats: { memberCount: 1, flipCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Add owner as admin member
    const memberRef = newFeedRef.collection('members').doc(uid);
    transaction.set(memberRef, {
      role: 'admin',
      displayName: displayName || null,
      photoURL: photoURL || null,
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Add feed to user's feeds sub-collection (reverse lookup)
    const userFeedRef = db().collection('users').doc(uid).collection('feeds').doc(feedId);
    transaction.set(userFeedRef, {
      feedId,
      role: 'admin',
      joinedAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`[createFeedTool] Created feed ${feedId}`);
  return { feedId };
}

/**
 * Get a feed by ID
 * 🔒 SECURE: Respects visibility - public feeds readable by any authenticated user, private by members only
 */
export async function getFeedTool(
  input: { feedId: string },
  { context }: { context?: ActionContext }
): Promise<Feed | null> {
  console.log('[getFeedTool] Getting feed:', input.feedId);

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const feedDoc = await db().collection('feeds').doc(input.feedId).get();

  if (!feedDoc.exists) {
    console.log('[getFeedTool] Feed not found');
    return null;
  }

  const data = feedDoc.data();
  if (!data) return null;

  // Check if personal feed (only owner can access)
  const isPersonalFeed = input.feedId.startsWith('personal_');
  if (isPersonalFeed) {
    const expectedPersonalFeedId = `personal_${uid}`;
    if (input.feedId !== expectedPersonalFeedId) {
      throw new Error("Unauthorized: Cannot access another user's personal feed");
    }
  } else {
    // For regular feeds, check visibility
    if (data.visibility === 'private') {
      // Check if user is a member
      const memberDoc = await db()
        .collection('feeds')
        .doc(input.feedId)
        .collection('members')
        .doc(uid)
        .get();

      if (!memberDoc.exists) {
        throw new Error('Unauthorized: Private feed requires membership');
      }
    }
  }

  const feed: Feed = {
    id: feedDoc.id,
    owner: data.owner,
    name: data.name,
    description: data.description,
    visibility: data.visibility,
    stats: {
      memberCount: data.stats?.memberCount || 0,
      flipCount: data.stats?.flipCount || 0,
    },
    createdAt: (data.createdAt?.toDate() || new Date()).toISOString(),
    updatedAt: (data.updatedAt?.toDate() || new Date()).toISOString(),
  };

  console.log('[getFeedTool] Feed fetched successfully');
  return feed;
}

/**
 * List feeds for the authenticated user
 * 🔒 SECURE: Returns only feeds the user is a member of
 */
export async function listUserFeedsTool(
  _input: unknown,
  { context }: { context?: ActionContext }
): Promise<Feed[]> {
  console.log('[listUserFeedsTool] Fetching user feeds');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Get user's feed memberships from their sub-collection
  const userFeedsSnapshot = await db().collection(`users/${uid}/feeds`).get();

  // Filter out invalid feedIds (undefined, null, empty string)
  const feedIds = userFeedsSnapshot.docs
    .map((doc) => doc.data().feedId)
    .filter((feedId) => feedId && typeof feedId === 'string' && feedId.trim().length > 0);

  if (feedIds.length === 0) {
    console.log('[listUserFeedsTool] User has no feeds');
    return [];
  }

  // Fetch all feeds
  const feedDocs = await Promise.all(
    feedIds.map((feedId) => db().collection('feeds').doc(feedId).get())
  );

  const feeds: Feed[] = feedDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        owner: data?.owner || '',
        name: data?.name || '',
        description: data?.description || '',
        visibility: data?.visibility || 'private',
        stats: {
          memberCount: data?.stats?.memberCount || 0,
          flipCount: data?.stats?.flipCount || 0,
        },
        createdAt: (data?.createdAt?.toDate() || new Date()).toISOString(),
        updatedAt: (data?.updatedAt?.toDate() || new Date()).toISOString(),
      };
    });

  console.log(`[listUserFeedsTool] Found ${feeds.length} feeds`);
  return feeds;
}

/**
 * Add a member to a feed
 * 🔒 SECURE: Only admins/moderators can add members (checked in transaction)
 */
export async function addMemberToFeedTool(
  input: {
    feedId: string;
    userId: string;
    role?: 'admin' | 'moderator' | 'member';
  },
  { context }: { context?: ActionContext }
): Promise<{ success: boolean }> {
  console.log('[addMemberToFeedTool] Adding member to feed');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const { feedId, userId, role = 'member' } = input;

  // Check if requester is admin or moderator
  const requesterMemberDoc = await db()
    .collection('feeds')
    .doc(feedId)
    .collection('members')
    .doc(uid)
    .get();

  if (!requesterMemberDoc.exists) {
    throw new Error('Unauthorized: You are not a member of this feed');
  }

  const requesterRole = requesterMemberDoc.data()?.role;
  if (requesterRole !== 'admin' && requesterRole !== 'moderator') {
    throw new Error('Unauthorized: Only admins and moderators can add members');
  }

  // Get user profile for displayName and photoURL
  const userDoc = await db().collection('users').doc(userId).get();
  const userData = userDoc.data();

  await db().runTransaction(async (transaction) => {
    // Add member to feed
    const memberRef = db().collection('feeds').doc(feedId).collection('members').doc(userId);
    transaction.set(memberRef, {
      role,
      displayName: userData?.displayName || null,
      photoURL: userData?.photoURL || null,
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Add feed to user's feeds sub-collection
    const userFeedRef = db().collection('users').doc(userId).collection('feeds').doc(feedId);
    transaction.set(userFeedRef, {
      feedId,
      role,
      joinedAt: FieldValue.serverTimestamp(),
    });

    // Increment member count
    const feedRef = db().collection('feeds').doc(feedId);
    transaction.update(feedRef, {
      'stats.memberCount': FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`[addMemberToFeedTool] Added user ${userId} to feed ${feedId}`);
  return { success: true };
}

/**
 * Remove a member from a feed
 * 🔒 SECURE: Users can remove themselves, admins can remove others
 */
export async function removeMemberFromFeedTool(
  input: {
    feedId: string;
    userId: string;
  },
  { context }: { context?: ActionContext }
): Promise<{ success: boolean }> {
  console.log('[removeMemberFromFeedTool] Removing member from feed');

  const auth = context?.auth as FlipFeedsAuthContext | undefined;
  const uid = auth?.uid;
  if (!uid) {
    throw new Error('Unauthorized: No authenticated user in context');
  }

  const { feedId, userId } = input;

  // Check authorization: user can remove themselves, or admin can remove others
  if (uid !== userId) {
    const requesterMemberDoc = await db()
      .collection('feeds')
      .doc(feedId)
      .collection('members')
      .doc(uid)
      .get();

    if (!requesterMemberDoc.exists || requesterMemberDoc.data()?.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can remove other members');
    }

    // Admins cannot remove themselves
    if (uid === userId) {
      throw new Error('Unauthorized: Admins cannot remove themselves');
    }
  }

  await db().runTransaction(async (transaction) => {
    // Remove member from feed
    const memberRef = db().collection('feeds').doc(feedId).collection('members').doc(userId);
    transaction.delete(memberRef);

    // Remove feed from user's feeds sub-collection
    const userFeedRef = db().collection('users').doc(userId).collection('feeds').doc(feedId);
    transaction.delete(userFeedRef);

    // Decrement member count
    const feedRef = db().collection('feeds').doc(feedId);
    transaction.update(feedRef, {
      'stats.memberCount': FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`[removeMemberFromFeedTool] Removed user ${userId} from feed ${feedId}`);
  return { success: true };
}

// ============================================================================
// GENKIT TOOLS REGISTRATION
// ============================================================================

/**
 * Register all feed management tools with the provided Genkit instance.
 */
export function registerFeedTools(ai: Genkit) {
  /**
   * Create a new feed
   */
  ai.defineTool(
    {
      name: 'createFeed',
      description: 'Create a new feed with the authenticated user as owner',
      inputSchema: z.object({
        name: z.string().min(1).max(100).describe('Feed name'),
        description: z.string().min(1).max(500).describe('Feed description'),
        visibility: z.enum(['public', 'private']).describe('Feed visibility'),
      }),
      outputSchema: z.object({ feedId: z.string() }),
    },
    async (input, { context }) => {
      return createFeedTool(input, { context });
    }
  );

  /**
   * Get a feed by ID
   */
  ai.defineTool(
    {
      name: 'getFeed',
      description: 'Get a feed by ID (respects visibility and membership)',
      inputSchema: z.object({
        feedId: z.string().describe('The feed ID to retrieve'),
      }),
      outputSchema: FeedSchema.nullable(),
    },
    async (input, { context }) => {
      return getFeedTool(input, { context });
    }
  );

  /**
   * List feeds for the authenticated user
   */
  ai.defineTool(
    {
      name: 'listUserFeeds',
      description: 'Get all feeds that the authenticated user is a member of',
      inputSchema: z.object({}),
      outputSchema: z.array(FeedSchema),
    },
    async (_input, { context }) => {
      return listUserFeedsTool(_input, { context });
    }
  );

  /**
   * Add a member to a feed
   */
  ai.defineTool(
    {
      name: 'addMemberToFeed',
      description: 'Add a member to a feed (requires admin or moderator role)',
      inputSchema: z.object({
        feedId: z.string().describe('The feed ID'),
        userId: z.string().describe('The user ID to add'),
        role: z
          .enum(['admin', 'moderator', 'member'])
          .optional()
          .describe('The role to assign (default: member)'),
      }),
      outputSchema: z.object({ success: z.boolean() }),
    },
    async (input, { context }) => {
      return addMemberToFeedTool(input, { context });
    }
  );

  /**
   * Remove a member from a feed
   */
  ai.defineTool(
    {
      name: 'removeMemberFromFeed',
      description:
        'Remove a member from a feed (users can remove themselves, admins can remove others)',
      inputSchema: z.object({
        feedId: z.string().describe('The feed ID'),
        userId: z.string().describe('The user ID to remove'),
      }),
      outputSchema: z.object({ success: z.boolean() }),
    },
    async (input, { context }) => {
      return removeMemberFromFeedTool(input, { context });
    }
  );
}
