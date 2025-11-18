import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { ActionContext, Genkit } from 'genkit';
import { z } from 'zod';

/**
 * Get Firestore instance lazily
 * This ensures Firebase Admin is initialized before accessing Firestore
 */
const db = () => getFirestore();

/**
 * Get Storage instance lazily
 */
const storage = () => getStorage();

// ============================================================================
// SCHEMAS
// ============================================================================

export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string().optional(),
  username: z.string().optional(),
  photoURL: z.string().url().optional(),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  feedCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================================================
// TOOL IMPLEMENTATION FUNCTIONS (Exported for use by flows)
// ============================================================================

/**
 * Get user profile from Firestore
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function getUserProfileTool(
  _input: unknown,
  context?: { auth?: { uid: string } }
): Promise<UserProfile | null> {
  console.log('[getUserProfileTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[getUserProfileTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log('[getUserProfileTool] Fetching profile for uid:', uid);
  const userDoc = await db().collection('users').doc(uid).get();

  if (!userDoc.exists) {
    console.log('[getUserProfileTool] Profile not found for uid:', uid);
    return null;
  }

  const data = userDoc.data();
  const profile: UserProfile = {
    uid,
    displayName: data?.displayName || undefined,
    username: data?.username || undefined,
    photoURL: data?.photoURL || undefined,
    bio: data?.bio || undefined,
    phoneNumber: data?.phoneNumber || undefined,
    email: data?.email || undefined,
    feedCount: data?.feedCount || 0,
    createdAt: (data?.createdAt?.toDate() || new Date()).toISOString(),
    updatedAt: (data?.updatedAt?.toDate() || new Date()).toISOString(),
  };

  console.log('[getUserProfileTool] Profile fetched successfully, username:', profile.username);
  return profile;
}

/**
 * Get all Feeds a user belongs to (reverse lookup)
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function getUserFeedsTool(
  _input: unknown,
  context?: { auth?: { uid: string } }
): Promise<Array<{ feedId: string; role: string; joinedAt: string }>> {
  console.log('[getUserFeedsTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[getUserFeedsTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log('[getUserFeedsTool] Fetching feeds for uid:', uid);
  const feedsSnapshot = await db().collection(`users/${uid}/feeds`).get();

  const feeds = feedsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      feedId: doc.id,
      role: data.role || 'member',
      joinedAt: (data.joinedAt?.toDate() || new Date()).toISOString(),
    };
  });

  console.log('[getUserFeedsTool] Found', feeds.length, 'feeds for user');
  return feeds;
}

/**
 * Check if username is available
 * ✅ PUBLIC: No authentication required
 */
export async function isUsernameAvailableTool(input: { username: string }): Promise<boolean> {
  console.log('[isUsernameAvailableTool] Checking availability for username:', input.username);

  const normalizedUsername = input.username.toLowerCase();
  const usernameDoc = await db().collection('usernames').doc(normalizedUsername).get();
  const available = !usernameDoc.exists;

  console.log('[isUsernameAvailableTool] Username available:', available);
  return available;
}

/**
 * Claim a username (used during profile update)
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function claimUsernameTool(
  input: { username: string },
  context?: { auth?: { uid: string } }
): Promise<boolean> {
  console.log('[claimUsernameTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[claimUsernameTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log('[claimUsernameTool] Attempting to claim username:', input.username, 'for uid:', uid);
  const normalizedUsername = input.username.toLowerCase();

  try {
    await db().collection('usernames').doc(normalizedUsername).create({
      userId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log('[claimUsernameTool] Username claimed successfully');
    return true;
  } catch (error) {
    // Username already exists
    console.log('[claimUsernameTool] Username already claimed:', error);
    return false;
  }
}

/**
 * Release a username (used when changing username)
 * 🔒 SECURE: Gets uid from context.auth to verify ownership before releasing
 */
export async function releaseUsernameTool(
  input: { username: string },
  context?: { auth?: { uid: string } }
): Promise<void> {
  console.log('[releaseUsernameTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[releaseUsernameTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log('[releaseUsernameTool] Releasing username:', input.username, 'for uid:', uid);

  // Verify ownership before deleting
  const normalizedUsername = input.username.toLowerCase();
  const usernameDoc = await db().collection('usernames').doc(normalizedUsername).get();

  if (usernameDoc.exists) {
    const data = usernameDoc.data();
    if (data?.userId !== uid) {
      console.error('[releaseUsernameTool] Unauthorized: Username belongs to different user');
      throw new Error('Unauthorized: Cannot release username owned by another user');
    }
  }

  await db().collection('usernames').doc(normalizedUsername).delete();
  console.log('[releaseUsernameTool] Username released successfully');
}

/**
 * Add username change to history (immutable audit log)
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function addUsernameHistoryTool(
  input: { oldUsername: string | null; newUsername: string },
  context?: { auth?: { uid: string } }
): Promise<void> {
  console.log('[addUsernameHistoryTool] Starting tool execution');

  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[addUsernameHistoryTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log(
    '[addUsernameHistoryTool] Adding history entry for uid:',
    uid,
    'old:',
    input.oldUsername,
    'new:',
    input.newUsername
  );

  await db().collection(`users/${uid}/usernameHistory`).add({
    oldUsername: input.oldUsername,
    newUsername: input.newUsername,
    changedAt: FieldValue.serverTimestamp(),
  });

  console.log('[addUsernameHistoryTool] History entry added successfully');
}

/**
 * Generate signed upload URL for profile image
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 *
 * Supports the Storage rules structure:
 * profile-images/{userId}/{imageType}/{imageId}
 * where imageType is: generated, selected, uploaded, processed
 */
export async function generateProfileImageUploadUrlTool(
  input: {
    imageType: 'generated' | 'selected' | 'uploaded' | 'processed';
    imageId: string;
    contentType: string;
  },
  context?: { auth?: { uid: string } }
): Promise<{ uploadUrl: string; publicUrl: string; storagePath: string }> {
  console.log('[generateProfileImageUploadUrlTool] Starting tool execution');

  const uid = context?.auth?.uid;
  if (!uid) {
    console.error(
      '[generateProfileImageUploadUrlTool] Unauthorized: No authenticated user in context'
    );
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Validate content type is an image
  if (!input.contentType.startsWith('image/')) {
    throw new Error('Invalid content type: must be an image/*');
  }

  const storagePath = `profile-images/${uid}/${input.imageType}/${input.imageId}`;
  console.log('[generateProfileImageUploadUrlTool] Generating upload URL for:', storagePath);

  const bucket = storage().bucket();
  const file = bucket.file(storagePath);

  // Generate signed upload URL (valid for 15 minutes)
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: input.contentType,
  });

  // Generate public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  console.log('[generateProfileImageUploadUrlTool] Upload URL generated successfully');

  return {
    uploadUrl,
    publicUrl,
    storagePath,
  };
}

/**
 * Delete profile image from Storage
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function deleteProfileImageTool(
  input: { storagePath: string },
  context?: { auth?: { uid: string } }
): Promise<void> {
  console.log('[deleteProfileImageTool] Starting tool execution');

  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[deleteProfileImageTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  // Verify the path belongs to the user
  if (!input.storagePath.startsWith(`profile-images/${uid}/`)) {
    console.error('[deleteProfileImageTool] Unauthorized: Path does not belong to user');
    throw new Error('Unauthorized: Cannot delete files that do not belong to you');
  }

  console.log('[deleteProfileImageTool] Deleting image at:', input.storagePath);

  const bucket = storage().bucket();
  const file = bucket.file(input.storagePath);

  try {
    await file.delete();
    console.log('[deleteProfileImageTool] Image deleted successfully');
  } catch (error: any) {
    if (error.code === 404) {
      console.log('[deleteProfileImageTool] Image not found (already deleted)');
      return;
    }
    throw error;
  }
}

/**
 * Update user profile
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 */
export async function updateUserProfileTool(
  input: {
    updates: {
      displayName?: string;
      username?: string;
      bio?: string;
      photoURL?: string;
      phoneNumber?: string;
      email?: string;
    };
  },
  context?: { auth?: { uid: string } }
): Promise<void> {
  console.log('[updateUserProfileTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[updateUserProfileTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log(
    '[updateUserProfileTool] Updating profile for uid:',
    uid,
    'with updates:',
    Object.keys(input.updates)
  );

  await db()
    .collection('users')
    .doc(uid)
    .update({
      ...input.updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log('[updateUserProfileTool] Profile updated successfully');
}

/**
 * Create user profile (called on signup)
 * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
 * ✅ Automatically creates personal feed (personal_{userId})
 */
export async function createUserProfileTool(
  input: {
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    email?: string;
    username?: string;
  },
  context?: { auth?: ActionContext }
): Promise<z.infer<typeof UserProfileOutputSchema>> {
  console.log('[createUserProfileTool] Starting tool execution');

  // 🔒 SECURITY: Only get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) {
    console.error('[createUserProfileTool] Unauthorized: No authenticated user in context');
    throw new Error('Unauthorized: No authenticated user in context');
  }

  console.log('[createUserProfileTool] Creating profile for uid:', uid);
  const timestamp = FieldValue.serverTimestamp();

  // Create user profile
  await db()
    .collection('users')
    .doc(uid)
    .set({
      ...context.auth,
      ...{
        displayName: context.auth?.displayName || input.displayName || null,
        username: context.auth?.username || input.username || null,
        photoURL: context.auth?.photoURL || input.photoURL || null,
        bio: null,
        phoneNumber: context.auth?.phoneNumber || input.phoneNumber || null,
        email: context.auth?.email || input.email || null,
        feedCount: 1, // Personal feed
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

  console.log('[createUserProfileTool] Profile created successfully');

  // Create personal feed automatically
  const personalFeedId = `personal_${uid}`;
  console.log('[createUserProfileTool] Creating personal feed:', personalFeedId);

  await db().collection('feeds').doc(personalFeedId).set({
    name: 'My Personal Feed',
    description: 'My private collection of videos',
    visibility: 'private',
    owner: uid,
    createdAt: timestamp,
    updatedAt: timestamp,
    memberCount: 1,
    flipCount: 0,
  });

  // Add user as admin of personal feed
  await db().collection('feeds').doc(personalFeedId).collection('members').doc(uid).set({
    role: 'admin',
    joinedAt: timestamp,
  });

  // Add feed to user's feeds subcollection
  await db().collection('users').doc(uid).collection('feeds').doc(personalFeedId).set({
    role: 'admin',
    joinedAt: timestamp,
  });

  // Store personal feed reference
  await db().collection('users').doc(uid).collection('personalFeed').doc('ref').set({
    feedId: personalFeedId,
    createdAt: timestamp,
  });

  console.log('[createUserProfileTool] Personal feed created successfully');

  const newProfile = await getUserProfileTool({}, { auth: context?.auth as any });
  if (!newProfile) {
    throw new Error('Failed to retrieve newly created profile');
  }

  return newProfile;
}

// ============================================================================
// GENKIT TOOLS REGISTRATION
// ============================================================================

// Output schemas
export const UserProfileOutputSchema = z.object({
  uid: z.string(),
  displayName: z.string().optional(),
  username: z.string().optional(),
  photoURL: z.string().url().optional(),
  bio: z.string().optional(),
  feedCount: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Register all user management tools with the provided Genkit instance.
 * This function is called from genkit.ts after Genkit is initialized.
 * It wraps the exported tool functions above.
 */
export function registerUserTools(ai: Genkit) {
  /**
   * Get user profile from Firestore
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'getUserProfile',
      description: 'Retrieves the authenticated user profile from Firestore',
      inputSchema: z.object({
        // NO uid parameter - security risk! Always use context.auth.uid
      }),
      outputSchema: UserProfileSchema.nullable(),
    },
    async (_input, { context }) => {
      return getUserProfileTool(_input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Get all Feeds a user belongs to (reverse lookup)
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'getUserFeeds',
      description: 'Get all feeds that the authenticated user is a member of',
      inputSchema: z.object({
        // NO uid parameter - security risk! Always use context.auth.uid
      }),
      outputSchema: z.array(
        z.object({
          feedId: z.string(),
          role: z.string(),
          joinedAt: z.string().datetime(),
        })
      ),
    },
    async (_input, { context }) => {
      return getUserFeedsTool(_input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Check if username is available
   * ✅ PUBLIC: No authentication required
   */
  ai.defineTool(
    {
      name: 'isUsernameAvailable',
      description: 'Check if a username is available for registration',
      inputSchema: z.object({
        username: z.string().min(3).max(20).describe('The username to check'),
      }),
      outputSchema: z.boolean(),
    },
    async (input) => {
      return isUsernameAvailableTool(input);
    }
  );

  /**
   * Claim a username (used during profile update)
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'claimUsername',
      description:
        'Claim a username for the authenticated user (registers it in the usernames collection)',
      inputSchema: z.object({
        // NO uid parameter - security risk! Always use context.auth.uid
        username: z.string().min(3).max(20).describe('The username to claim'),
      }),
      outputSchema: z.boolean().describe('True if username was successfully claimed'),
    },
    async (input, { context }) => {
      return claimUsernameTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Release a username (used when changing username)
   * 🔒 SECURE: Gets uid from context.auth to verify ownership before releasing
   */
  ai.defineTool(
    {
      name: 'releaseUsername',
      description:
        'Release a username (delete from usernames collection) - must be owned by authenticated user',
      inputSchema: z.object({
        username: z.string().describe('The username to release'),
      }),
      outputSchema: z.void(),
    },
    async (input, { context }) => {
      return releaseUsernameTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Update user profile
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'updateUserProfile',
      description: 'Update authenticated user profile fields in Firestore',
      inputSchema: z.object({
        // NO uid parameter - security risk! Always use context.auth.uid
        updates: z
          .object({
            displayName: z.string().optional(),
            username: z.string().optional(),
            bio: z.string().optional(),
            photoURL: z.string().url().optional(),
            phoneNumber: z.string().optional(),
            email: z.string().email().optional(),
          })
          .describe('The fields to update'),
      }),
      outputSchema: z.void(),
    },
    async (input, { context }) => {
      return updateUserProfileTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Create user profile (called on signup)
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   * ✅ Automatically creates personal feed (personal_{userId})
   */
  ai.defineTool(
    {
      name: 'createUserProfile',
      description:
        'Create a new user profile in Firestore during signup for the authenticated user. Automatically creates a personal feed.',
      inputSchema: z.object({
        // NO uid parameter - security risk! Always use context.auth.uid
        displayName: z.string().optional().describe('User display name'),
        photoURL: z.string().url().optional().describe('User profile photo URL'),
        phoneNumber: z.string().optional().describe('User phone number'),
        email: z.string().email().optional().describe('User email address'),
      }),
      outputSchema: UserProfileOutputSchema,
    },
    async (input, { context }) => {
      return createUserProfileTool(input, {
        auth: context?.auth,
      });
    }
  );

  /**
   * Add username change to history (immutable audit log)
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'addUsernameHistory',
      description:
        "Record a username change in the user's immutable history log (usernameHistory subcollection)",
      inputSchema: z.object({
        oldUsername: z.string().nullable().describe('Previous username (null if first username)'),
        newUsername: z.string().describe('New username'),
      }),
      outputSchema: z.void(),
    },
    async (input, { context }) => {
      return addUsernameHistoryTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Generate signed upload URL for profile image
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'generateProfileImageUploadUrl',
      description:
        'Generate a signed URL for uploading a profile image to Firebase Storage. Returns upload URL, public URL, and storage path.',
      inputSchema: z.object({
        imageType: z
          .enum(['generated', 'selected', 'uploaded', 'processed'])
          .describe(
            'Type of image: generated (AI), selected (chosen), uploaded (user), processed (optimized)'
          ),
        imageId: z.string().describe('Unique image identifier (e.g., UUID)'),
        contentType: z.string().describe('Image content type (e.g., image/jpeg, image/png)'),
      }),
      outputSchema: z.object({
        uploadUrl: z.string().describe('Signed URL for uploading (valid 15 minutes)'),
        publicUrl: z.string().describe('Public URL for accessing the image after upload'),
        storagePath: z
          .string()
          .describe('Storage path: profile-images/{userId}/{imageType}/{imageId}'),
      }),
    },
    async (input, { context }) => {
      return generateProfileImageUploadUrlTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );

  /**
   * Delete profile image from Storage
   * 🔒 SECURE: Gets uid from context.auth only - prevents impersonation
   */
  ai.defineTool(
    {
      name: 'deleteProfileImage',
      description:
        'Delete a profile image from Firebase Storage. User can only delete their own images.',
      inputSchema: z.object({
        storagePath: z
          .string()
          .describe('Storage path to delete (must belong to authenticated user)'),
      }),
      outputSchema: z.void(),
    },
    async (input, { context }) => {
      return deleteProfileImageTool(input, {
        auth: context?.auth as { uid: string } | undefined,
      });
    }
  );
}
