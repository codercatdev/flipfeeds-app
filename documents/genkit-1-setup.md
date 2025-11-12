
# Genkit Backend - Part 1: Setup & Basic Tools

This chunk focuses on initializing Genkit and creating the first tools (simple, reusable functions) for managing users and feeds. This assumes you have a Genkit project initialized (genkit init).File: flipfeeds-genkit/src/index.ts (or similar)Task 1.1: Initialize Genkit with FirebaseWe need to configure Genkit to use Firebase services (like Firestore) and enable the Firebase Emulator Suite for local testing.// flipfeeds-genkit/src/index.ts
import { initializeGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { vertexAI } from '@genkit-ai/vertex-ai';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Genkit's `firebase()` plugin might handle this, but explicit init is safer
// for direct DB access.
admin.initializeApp();

// Use Emulator Suite if GCLOUD_PROJECT is not set (local dev)
if (!process.env.GCLOUD_PROJECT) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  console.log('Using Firebase Emulator Suite');
}

const db = getFirestore();

export default initializeGenkit({
  plugins: [
    firebase(), // Configures Firebase auth/functions integration
    vertexAI({ location: 'us-central1' }), // Or your preferred AI model provider
  ],
  logLevel: 'debug', // Good for development
  enableTracingAndMetrics: true, // For Genkit Inspector
});
Task 1.2: Define User Management ToolCreate a Genkit tool to get user data. Tools are the building blocks for flows.File: flipfeeds-genkit/src/tools/userTools.ts// flipfeeds-genkit/src/tools/userTools.ts
import { defineTool } from '@genkit-ai/core';
import { getFirestore } from 'firebase-admin/firestore';
import * as z from 'zod';

const db = getFirestore();
const usersRef = db.collection('users');

// Tool to get a user's profile from Firestore
export const getUserProfile = defineTool(
  {
    name: 'getUserProfile',
    description: "Retrieves a user's public profile from Firestore.",
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.object({
      uid: z.string(),
      displayName: z.string(),
      username: z.string(),
      photoURL: z.string().optional(),
      bio: z.string().optional(),
    }),
  },
  async ({ userId }) => {
    const userDoc = await usersRef.doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    const userData = userDoc.data()!;
    return {
      uid: userData.uid,
      displayName: userData.displayName,
      username: userData.username,
      photoURL: userData.photoURL,
      bio: userData.bio,
    };
  },
);
## Task 1.3: Define Feed Management Tools

Create tools for getting feed data and checking membership.

**File:** `flipfeeds-genkit/src/tools/feedTools.ts`

```typescript
// flipfeeds-genkit/src/tools/feedTools.ts
import { defineTool } from '@genkit-ai/core';
import { getFirestore } from 'firebase-admin/firestore';
import * as z from 'zod';

const db = getFirestore();
const feedsRef = db.collection('feeds');

// Tool to get a feed's data
export const getFeedData = defineTool(
  {
    name: 'getFeedData',
    description: 'Retrieves data for a specific feed.',
    inputSchema: z.object({ feedId: z.string() }),
    outputSchema: z.object({
      name: z.string(),
      description: z.string(),
      logoURL: z.string().optional(),
      visibility: z.string(), // 'public' | 'private'
      ownerId: z.string(),
      memberCount: z.number(),
    }),
  },
  async ({ feedId }) => {
    const feedDoc = await feedsRef.doc(feedId).get();
    if (!feedDoc.exists) {
      throw new Error(`Feed with ID ${feedId} not found.`);
    }
    const data = feedDoc.data()!;
    return {
      name: data.name,
      description: data.description,
      logoURL: data.logoURL || '',
      visibility: data.visibility,
      ownerId: data.ownerId,
      memberCount: data.stats.memberCount || 0,
    };
  },
);

// Tool to check if a user is a member of a feed
export const checkFeedMembership = defineTool(
  {
    name: 'checkFeedMembership',
    description: 'Checks if a user is a member of a given feed.',
    inputSchema: z.object({
      feedId: z.string(),
      userId: z.string(),
    }),
    outputSchema: z.object({
      isMember: z.boolean(),
      role: z.string().optional(), // 'admin', 'moderator', 'member'
    }),
  },
  async ({ feedId, userId }) => {
    const memberDoc = await feedsRef
      .doc(feedId)
      .collection('members')
      .doc(userId)
      .get();

    if (!memberDoc.exists) {
      return { isMember: false };
    }
    return {
      isMember: true,
      role: memberDoc.data()?.role || 'member',
    };
  },
);
