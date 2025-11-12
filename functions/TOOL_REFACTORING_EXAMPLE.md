# Tool Refactoring Example

This document shows the pattern for converting utility functions to Genkit tools.

## Pattern: Before → After

### Before (Regular Function)
```typescript
// tools/userTools.ts
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) return null;
    
    const data = userDoc.data();
    return {
        uid,
        displayName: data?.displayName,
        // ... more fields
    };
}
```

### After (Genkit Tool)
```typescript
// tools/userTools.ts
import { ai } from '../genkit';

export const getUserProfileTool = ai.defineTool(
    {
        name: 'getUserProfile',
        description: 'Retrieves a user profile from Firestore by user ID',
        inputSchema: z.object({
            uid: z.string().describe('The Firebase Auth user ID'),
        }),
        outputSchema: UserProfileSchema.nullable(),
    },
    async (input) => {
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(input.uid).get();
        
        if (!userDoc.exists) return null;
        
        const data = userDoc.data();
        return {
            uid: input.uid,
            displayName: data?.displayName,
            // ... more fields
        };
    }
);
```

## How Flows Use Tools

### Option 1: Direct Call (when you don't need AI)
```typescript
// flows/userFlows.ts
import { getUserProfileTool } from '../tools/userTools';

export const getUserFlow = ai.defineFlow(..., async (input) => {
    // Call the tool directly
    const profile = await getUserProfileTool(input);
    return profile;
});
```

### Option 2: AI-Powered (let AI decide when to use)
```typescript
// flows/userFlows.ts
import { getUserProfileTool } from '../tools/userTools';

export const getUserFlow = ai.defineFlow(..., async (input) => {
    // Let AI use the tool
    const { output } = await ai.generate({
        prompt: `Get user profile for ${input.uid}`,
        tools: [getUserProfileTool],
    });
    return output;
});
```

### Option 3: Multiple Tools (AI picks which to use)
```typescript
export const manageUserFlow = ai.defineFlow(..., async (input) => {
    const { output } = await ai.generate({
        prompt: input.task, // "update user bio" or "get user feeds"
        tools: [
            getUserProfileTool,
            updateUserProfileTool,
            getUserFeedsTool,
        ],
    });
    return output;
});
```

## Complete Example: Feed Tools

```typescript
// tools/feedTools.ts
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { ai } from '../genkit';

const db = admin.firestore();

// ============================================================================
// SCHEMAS
// ============================================================================

export const FeedSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    visibility: z.enum(['public', 'private', 'personal']),
    ownerId: z.string(),
    // ... more fields
});

export const MemberSchema = z.object({
    userId: z.string(),
    role: z.enum(['admin', 'moderator', 'member']),
    joinedAt: z.date(),
});

// ============================================================================
// GENKIT TOOLS
// ============================================================================

export const getFeedDataTool = ai.defineTool(
    {
        name: 'getFeedData',
        description: 'Get feed information from Firestore by feed ID',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID to retrieve'),
        }),
        outputSchema: FeedSchema.nullable(),
    },
    async (input) => {
        const feedDoc = await db.collection('feeds').doc(input.feedId).get();
        if (!feedDoc.exists) return null;
        
        const data = feedDoc.data();
        return {
            id: input.feedId,
            name: data?.name || '',
            // ... map all fields
        };
    }
);

export const checkFeedMembershipTool = ai.defineTool(
    {
        name: 'checkFeedMembership',
        description: 'Check if a user is a member of a feed and get their role',
        inputSchema: z.object({
            feedId: z.string().describe('The feed ID'),
            userId: z.string().describe('The user ID to check'),
        }),
        outputSchema: MemberSchema.nullable(),
    },
    async (input) => {
        const memberDoc = await db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId)
            .get();
        
        if (!memberDoc.exists) return null;
        
        const data = memberDoc.data();
        return {
            userId: input.userId,
            role: data?.role || 'member',
            joinedAt: data?.joinedAt?.toDate() || new Date(),
        };
    }
);

export const addFeedMemberTool = ai.defineTool(
    {
        name: 'addFeedMember',
        description: 'Add a user as a member to a feed',
        inputSchema: z.object({
            feedId: z.string(),
            userId: z.string(),
            displayName: z.string().optional(),
            photoURL: z.string().url().optional(),
            role: z.enum(['admin', 'moderator', 'member']).default('member'),
        }),
        outputSchema: z.void(),
    },
    async (input) => {
        const batch = db.batch();
        
        // Add to members sub-collection
        const memberRef = db
            .collection('feeds')
            .doc(input.feedId)
            .collection('members')
            .doc(input.userId);
        
        batch.set(memberRef, {
            userId: input.userId,
            displayName: input.displayName || null,
            photoURL: input.photoURL || null,
            role: input.role,
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Increment counts...
        
        await batch.commit();
    }
);
```

## Registration in genkit.ts

```typescript
// genkit.ts

// Import all TOOLS to register them
import './tools/userTools';
import './tools/feedTools';
import './tools/flipTools';
import './tools/videoTools';

// Import all FLOWS to register them  
import './flows/userFlows';
import './flows/feedFlows';
import './flows/flipFlows';
import './flows/flipLinkFlows';
import './flows/inviteFlows';
```

## Benefits of Genkit Tools

### 1. AI Can Use Them
```typescript
const { output } = await ai.generate({
    prompt: "Get the feed info for feed-123 and check if user-456 is a member",
    tools: [getFeedDataTool, checkFeedMembershipTool],
});
// AI decides which tools to call and in what order
```

### 2. Visible in Genkit CLI
- Tools appear in Developer UI
- Can test tools individually
- See tool schemas and descriptions

### 3. Self-Documenting
- Input/output schemas are explicit
- Descriptions help AI (and humans) understand usage
- Type-safe with Zod validation

### 4. Composable
```typescript
// Mix and match tools
const { output } = await ai.generate({
    prompt: "Create a feed and add 3 members",
    tools: [
        createFeedTool,
        addFeedMemberTool,
        getUserProfileTool,
    ],
});
```

## Migration Strategy

### Phase 1: Convert Core Tools (DONE)
- ✅ userTools.ts refactored
- Next: feedTools.ts, flipTools.ts, videoTools.ts

### Phase 2: Update Flows
- Change imports from functions to tools
- Decide: direct call vs AI-powered for each flow

### Phase 3: Register in genkit.ts
- Import all tool files
- Tools auto-register when imported

### Phase 4: Test
- Use `pnpm genkit:dev` to see tools in UI
- Test each tool individually
- Test flows with tools

## Quick Reference

```typescript
// Define a tool
export const myTool = ai.defineTool(
    {
        name: 'myTool',                    // Tool name (for AI)
        description: 'What it does',       // Help AI understand
        inputSchema: z.object({...}),      // Input validation
        outputSchema: z.string(),          // Output validation
    },
    async (input) => {
        // Implementation
        return result;
    }
);

// Use in flow (direct call)
const result = await myTool({ param: 'value' });

// Use in flow (AI-powered)
const { output } = await ai.generate({
    prompt: 'Do something',
    tools: [myTool],
});
```
