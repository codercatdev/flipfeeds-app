import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

export const createFeedFlow = ai.defineFlow(
  {
    name: 'createFeedFlow',
    inputSchema: z.object({
      name: z.string(),
      description: z.string(),
      visibility: z.enum(['public', 'private']),
    }),
    outputSchema: z.object({ feedId: z.string() }),
  },
  async (data, { context }) => {
    if (!context?.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { uid, token } = context.auth;
    const { displayName, photoURL } = token;
    const { name, description, visibility } = data;

    const newFeedRef = db.collection('feeds').doc();
    const feedId = newFeedRef.id;

    await db.runTransaction(async (transaction) => {
      transaction.set(newFeedRef, {
        owner: uid,
        name,
        description,
        visibility,
        stats: { memberCount: 1, flipCount: 0 },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const memberRef = newFeedRef.collection('members').doc(uid);
      transaction.set(memberRef, {
        role: 'admin',
        displayName,
        photoURL,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const userFeedRef = db.collection('users').doc(uid).collection('feeds').doc(feedId);
      transaction.set(userFeedRef, {
        feedId,
        role: 'admin',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { feedId };
  }
);
