# Genkit Backend - Part 2: Core Flows

Now we'll create Genkit flows. Flows orchestrate one or more tools (and AI models) to perform complex actions. These are the main entry points for your MCP server and Firebase Functions.

## Task 2.1: createFeed Flow

This flow handles creating a new Feed, setting the creator as the owner, and updating counts. It uses Firestore transactions to ensure atomicity.

**File:** `flipfeeds-genkit/src/flows/feedFlows.ts`

```typescript
// flipfeeds-genkit/src/flows/feedFlows.ts
import { defineFlow } from '@genkit-ai/flow';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as z from 'zod';
// We'll also need the user tool from part 1
import { getUserProfile } from '../tools/userTools';

const db = getFirestore();
const feedsRef = db.collection('v1/feeds');
const usersRef = db.collection('v1/users');

export const createFeedFlow = defineFlow(
  {
    name: 'createFeedFlow',
    description: 'Creates a new feed and sets the user as owner.',
    inputSchema: z.object({
      userId: z.string(), // The user creating the feed
      name: z.string().min(3).max(50),
      description: z.string().max(250),
      visibility: z.enum(['public', 'private']),
      tags: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      feedId: z.string(),
      success: z.boolean(),
    }),
  },
  async (input) => {
    const { userId, name, description, visibility, tags } = input;

    // 1. Get the user's profile data to denormalize
    const userProfile = await getUserProfile({ userId });

    const newFeedRef = feedsRef.doc();
    const memberRef = newFeedRef.collection('members').doc(userId);
    const userFeedRef = usersRef.doc(userId).collection('feeds').doc(newFeedRef.id);

    // 2. Use a transaction to create all documents atomically
    await db.runTransaction(async (transaction) => {
      // Create the main feed doc
      transaction.set(newFeedRef, {
        name,
        description,
        visibility,
        tags: tags || [],
        ownerId: userId,
        logoURL: '[https://placehold.co/100x100/F26F21/FFFFFF?text=FF](https://placehold.co/100x100/F26F21/FFFFFF?text=FF)', // Default logo
        bannerURL: '[https://placehold.co/600x200/F26F21/FFFFFF?text=FlipFeeds](https://placehold.co/600x200/F26F21/FFFFFF?text=FlipFeeds)', // Default banner
        stats: {
          memberCount: 1,
          flipCount: 0,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Add the owner as the first member
      transaction.set(memberRef, {
        userId: userId,
        role: 'admin',
        joinedAt: FieldValue.serverTimestamp(),
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
      });

      // Add to the user's list of feeds (reverse lookup)
      transaction.set(userFeedRef, {
        feedId: newFeedRef.id,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'admin',
        name: name, // Denormalized
        logoURL: '[https://placehold.co/100x100/F26F21/FFFFFF?text=FF](https://placehold.co/100x100/F26F21/FFFFFF?text=FF)', // Denormalized
      });
    });

    return {
      feedId: newFeedRef.id,
      success: true,
    };
  },
);
```

## Task 2.2: joinFeed Flow

This flow allows a user to join a public feed. (Private feeds would need an invite flow).

**File:** `flipfeeds-genkit/src/flows/feedFlows.ts` (add to this file)

```typescript
// flipfeeds-genkit/src/flows/feedFlows.ts
// ... (imports and createFeedFlow from above) ...
import { getFeedData, checkFeedMembership } from '../tools/feedTools';

export const joinFeedFlow = defineFlow(
  {
    name: 'joinFeedFlow',
    description: 'Allows a user to join a public feed.',
    inputSchema: z.object({
      userId: z.string(),
      feedId: z.string(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ userId, feedId }) => {
    // 1. Get Feed and User data
    const [feedData, userProfile] = await Promise.all([
      getFeedData({ feedId }),
      getUserProfile({ userId }),
    ]);

    // 2. Check rules
    if (feedData.visibility !== 'public') {
      return { success: false, message: 'This feed is private and requires an invite.' };
    }

    const membership = await checkFeedMembership({ feedId, userId });
    if (membership.isMember) {
      return { success: false, message: 'User is already a member.' };
    }

    // 3. Use transaction to add member and update counts
    const feedRef = feedsRef.doc(feedId);
    const memberRef = feedRef.collection('members').doc(userId);
    const userFeedRef = usersRef.doc(userId).collection('feeds').doc(feedId);

    await db.runTransaction(async (transaction) => {
      // Add member to feed
      transaction.set(memberRef, {
        userId: userId,
        role: 'member',
        joinedAt: FieldValue.serverTimestamp(),
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
      });

      // Add to user's list of feeds
      transaction.set(userFeedRef, {
        feedId: feedId,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'member',
        name: feedData.name, // Denormalized
        logoURL: feedData.logoURL || '', // Denormalized from feed data
      });

      // Increment member count
      transaction.update(feedRef, {
        'stats.memberCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true, message: `Successfully joined ${feedData.name}!` };
  },
);
```
