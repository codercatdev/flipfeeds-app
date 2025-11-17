/**
 * Authorization Helpers for Genkit Tools and Flows
 *
 * Since Firebase Admin SDK bypasses Firestore security rules, we need to
 * implement authorization checks manually in our tools and flows.
 *
 * This module provides helper functions to enforce authorization policies
 * that mirror the logic in firestore.rules.
 */

import { UserFacingError } from 'genkit';
import type { FlipFeedsAuthContext } from './contextProvider';

/**
 * Check if the authenticated user is the owner of a resource
 * Mirrors: function isOwner(uid) in firestore.rules
 */
export function isOwner(context: { auth?: FlipFeedsAuthContext }, resourceUserId: string): boolean {
  if (!context.auth?.uid) {
    return false;
  }
  return context.auth.uid === resourceUserId;
}

/**
 * Require that the authenticated user is the owner of a resource
 * Throws an error if the user is not the owner
 */
export function requireOwner(
  context: { auth?: FlipFeedsAuthContext },
  resourceUserId: string,
  resourceType = 'resource'
): void {
  if (!context.auth?.uid) {
    throw new UserFacingError('UNAUTHENTICATED', 'Authentication required');
  }

  if (!isOwner(context, resourceUserId)) {
    throw new UserFacingError(
      'PERMISSION_DENIED',
      `You do not have permission to access this ${resourceType}`
    );
  }
}

/**
 * Check if the authenticated user is a participant in a friendship
 * Mirrors: request.auth.uid in resource.data.users check in firestore.rules
 */
export function isFriendshipParticipant(
  context: { auth?: FlipFeedsAuthContext },
  friendshipUsers: string[]
): boolean {
  if (!context.auth?.uid) {
    return false;
  }
  return friendshipUsers.includes(context.auth.uid);
}

/**
 * Require that the authenticated user is a participant in a friendship
 */
export function requireFriendshipParticipant(
  context: { auth?: FlipFeedsAuthContext },
  friendshipUsers: string[]
): void {
  if (!context.auth?.uid) {
    throw new UserFacingError('UNAUTHENTICATED', 'Authentication required');
  }

  if (!isFriendshipParticipant(context, friendshipUsers)) {
    throw new UserFacingError(
      'PERMISSION_DENIED',
      'You do not have permission to access this friendship'
    );
  }
}

/**
 * Best practice: Always pass context to tools
 *
 * Tools should accept context as the second parameter and enforce authorization:
 *
 * @example
 * export const getUserProfileTool = ai.defineTool(
 *   {
 *     name: 'getUserProfile',
 *     inputSchema: z.object({ uid: z.string() }),
 *     outputSchema: UserProfileSchema.nullable(),
 *   },
 *   async (input, { context }) => {
 *     // Enforce that user can only read their own profile
 *     requireOwner(context, input.uid, 'user profile');
 *
 *     const userDoc = await db.collection('users').doc(input.uid).get();
 *     // ... rest of implementation
 *   }
 * );
 */

/**
 * Get the authenticated user's ID from context
 * Throws an error if not authenticated
 */
export function getAuthenticatedUserId(context?: { auth?: FlipFeedsAuthContext }): string {
  if (!context?.auth?.uid) {
    throw new UserFacingError('UNAUTHENTICATED', 'Authentication required');
  }
  return context.auth.uid;
}

/**
 * Alternative pattern: Use context.auth.uid directly instead of accepting uid as input
 *
 * This prevents callers from requesting other users' data in the first place:
 *
 * @example
 * export const getMyProfileTool = ai.defineTool(
 *   {
 *     name: 'getMyProfile',
 *     description: 'Get the authenticated user\'s profile',
 *     inputSchema: z.object({}), // No uid parameter needed
 *     outputSchema: UserProfileSchema.nullable(),
 *   },
 *   async (_input, { context }) => {
 *     const uid = getAuthenticatedUserId(context);
 *     const userDoc = await db.collection('users').doc(uid).get();
 *     // ... rest of implementation
 *   }
 * );
 */
