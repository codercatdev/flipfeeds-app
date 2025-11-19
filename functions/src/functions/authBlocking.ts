/**
 * Authentication Blocking Functions
 *
 * These functions execute synchronously during the authentication flow
 * to enforce access control based on the allowedUsers collection in Firestore.
 *
 * For production, this prevents authentication for any email address
 * not explicitly listed in the allowedUsers collection.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import type { AuthBlockingEvent } from 'firebase-functions/v2/identity';

// Initialize Firebase Admin
initializeApp();

const db = getFirestore();

/**
 * Check if a user is allowed to authenticate
 * @param email - The user's email address
 * @returns Promise<boolean> - true if allowed, false otherwise
 */
async function isUserAllowed(email: string | undefined): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    // Query the allowedUsers collection for this email
    const allowedUserDoc = await db.collection('allowedUsers').doc(email).get();
    return allowedUserDoc.exists;
  } catch (error) {
    functions.logger.error('Error checking allowed users:', error);
    // Fail closed - if we can't check, deny access
    return false;
  }
}

/**
 * Blocking function that runs before a user is created
 * Prevents user creation if email is not in allowedUsers collection
 */
export const beforeUserCreated = functions.identity.beforeUserCreated(
  async (event: AuthBlockingEvent) => {
    const email = event.data?.email;

    functions.logger.info('beforeUserCreated triggered', { email });

    const isAllowed = await isUserAllowed(email);

    if (!isAllowed) {
      functions.logger.warn('User creation blocked - email not in allowedUsers', {
        email,
      });
      throw new functions.https.HttpsError(
        'permission-denied',
        'Your email address is not authorized to create an account. Please contact support.'
      );
    }

    functions.logger.info('User creation allowed', { email });
    // Return nothing to allow the operation to proceed
  }
);

/**
 * Blocking function that runs before a user signs in
 * Prevents sign-in if email is not in allowedUsers collection
 */
export const beforeUserSignedIn = functions.identity.beforeUserSignedIn(
  async (event: AuthBlockingEvent) => {
    const email = event.data?.email;

    functions.logger.info('beforeUserSignedIn triggered', { email });

    const isAllowed = await isUserAllowed(email);

    if (!isAllowed) {
      functions.logger.warn('Sign-in blocked - email not in allowedUsers', {
        email,
      });
      throw new functions.https.HttpsError(
        'permission-denied',
        'Your email address is not authorized to sign in. Please contact support.'
      );
    }

    functions.logger.info('Sign-in allowed', { email });
    // Return nothing to allow the operation to proceed
  }
);
