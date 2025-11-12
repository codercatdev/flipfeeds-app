# Genkit CLI Testing Guide

## Overview

This guide explains how to test Genkit flows and tools using the Genkit CLI in the FlipFeeds monorepo.

## Architecture

### Two Entry Points

1. **Production Entry Point** (`src/genkit.ts`)
   - Used by Firebase Functions
   - Deployed to Firebase Cloud Functions
   - Exports flows as Firebase callable functions via MCP server

2. **Development Entry Point** (`src/genkit-dev.ts`)
   - Used exclusively for Genkit CLI testing
   - Points to Firebase Emulators for local development
   - Same flows and tools as production

### Why This Approach?

- **Genkit CLI cannot access Firebase Emulators directly** - They run as separate processes
- **Shared tools and flows** - Both entry points use the same flow/tool implementations
- **Firebase Admin SDK integration** - Tools use Firebase Admin, which can be configured to use emulators
- **No code duplication** - Flows are defined once, imported in both contexts

## Usage

### 1. Start Firebase Emulators

In one terminal window:

```bash
# From root directory
pnpm emulators
```

This will:
- Kill any processes on emulator ports
- Build the functions
- Start Firebase Emulators (Firestore, Auth, Functions, etc.)
- Watch for changes and rebuild

### 2. Start Genkit CLI in Development Mode

In another terminal window:

```bash
# From root directory
pnpm genkit:dev

# OR from functions directory (uses pre-built JS)
cd functions
pnpm genkit:dev:build

# OR from functions directory (with TypeScript watch mode)
cd functions
pnpm genkit:dev
```

This will:
- Build your TypeScript code
- Start Genkit CLI with emulator configuration
- Open the Genkit Developer UI in your browser at http://localhost:4001
- Connect to Firestore Emulator on `localhost:8080`

### 3. Test Your Flows

In the Genkit Developer UI (http://localhost:4001):

1. **View all registered flows**
   - User flows: `createUserFlow`, `updateUserProfileFlow`, etc.
   - Feed flows: `createFeedFlow`, `addUserToFeedFlow`, etc.
   - Flip flows: `createFlipFlow`, etc.

2. **Test a flow interactively**
   - Select a flow from the list
   - Provide input JSON matching the schema
   - Click "Run"
   - View output and trace

3. **Inspect flow traces**
   - See step-by-step execution
   - View tool calls
   - Check Firebase operations

## Environment Variables

### Required for Genkit CLI

```bash
# Gemini API Key (for AI features)
export GEMINI_API_KEY="your-api-key"

# Firestore Emulator (automatically set by genkit:dev script)
export FIRESTORE_EMULATOR_HOST="localhost:8080"

# Optional: Firebase Project ID
export GCLOUD_PROJECT="demo-flipfeeds"
```

### Setting Up .env File

Create `functions/.env` (not committed to git):

```bash
GEMINI_API_KEY=your-actual-api-key-here
GCLOUD_PROJECT=demo-flipfeeds
```

The `genkit:dev` script will automatically set `FIRESTORE_EMULATOR_HOST`.

## Testing Workflows

### Testing a User Flow

1. Start emulators and Genkit CLI (as described above)
2. In Genkit UI, select `createUserFlow`
3. Provide input:
```json
{
  "uid": "test-user-123",
  "displayName": "Test User",
  "email": "test@example.com"
}
```
4. Click "Run"
5. Verify the user was created in Firestore Emulator UI (http://localhost:4000/firestore)

### Testing a Feed Flow

1. Select `createFeedFlow`
2. Provide input:
```json
{
  "name": "Test Feed",
  "description": "A test feed",
  "createdBy": "test-user-123"
}
```
3. Click "Run"
4. Verify the feed was created in Firestore

### Testing Flows with AI

Flows that use AI models will call the actual Gemini API using your API key.

## Should You Use Firebase MCP Tools?

### Current Approach: Direct Firebase Admin SDK
✅ **Recommended for now**

**Pros:**
- Full control over Firestore operations
- Type-safe with TypeScript
- Well-documented and stable
- Works seamlessly with emulators
- No additional dependencies

**Cons:**
- More boilerplate code
- Manual schema validation needed

### Alternative: Firebase MCP Tools

The `genkitx-mcp` package you're already using provides Firebase-specific tools, but they're primarily designed for:
- Connecting external MCP clients to Firebase
- Exposing Firebase operations through MCP protocol

**When to use Firebase MCP Tools:**
- If you want to expose Firebase operations to external MCP clients
- If you need standardized Firebase operations across multiple MCP servers

**When NOT to use:**
- For internal flow logic (your current use case)
- When you need custom business logic
- When you need fine-grained control

### Recommended Pattern

Keep your current approach:

```typescript
// tools/userTools.ts
import * as admin from 'firebase-admin';

export async function getUserProfile(uid: string) {
  const db = admin.firestore();
  const doc = await db.collection('users').doc(uid).get();
  return doc.data();
}
```

This gives you:
- Direct control
- Easy emulator integration
- Better testability
- Clear separation between MCP server (for external access) and internal tools

## Advanced: Creating Genkit Tools from Your Functions

If you want to make your tool functions reusable as Genkit tools:

```typescript
// tools/userTools.ts
import { ai } from '../genkit';
import { z } from 'zod';

// Define as Genkit tool
export const getUserProfileTool = ai.defineTool(
  {
    name: 'getUserProfile',
    description: 'Get user profile from Firestore',
    inputSchema: z.object({ uid: z.string() }),
    outputSchema: UserProfileSchema,
  },
  async (input) => {
    return await getUserProfile(input.uid);
  }
);

// Keep the original function for non-Genkit use
export async function getUserProfile(uid: string) {
  // ... implementation
}
```

This allows:
- AI agents to call your tools
- Better observability in Genkit UI
- Reusability across flows

## Troubleshooting

### "Cannot connect to Firestore Emulator"

**Solution:** Make sure emulators are running first:
```bash
pnpm emulators
```

### "GEMINI_API_KEY not set"

**Solution:** Create `functions/.env` with your API key or export it:
```bash
export GEMINI_API_KEY="your-key"
```

### "Flow not found in Genkit UI"

**Solution:** 
1. Make sure the flow is imported in `genkit-dev.ts`
2. Rebuild: `pnpm --filter functions build`
3. Restart Genkit CLI

### Changes not reflecting

**Solution:**
- Genkit CLI doesn't watch for changes
- After code changes: Stop CLI (`Ctrl+C`) → Rebuild → Restart
- Or use: `pnpm --filter functions build:watch` in another terminal

## Best Practices

1. **Always test with emulators first** before deploying
2. **Use meaningful test data** that represents real scenarios
3. **Check Firestore Emulator UI** to verify data operations
4. **Use flow traces** to debug issues
5. **Keep flows small and focused** for easier testing
6. **Write integration tests** for critical flows
7. **Use environment variables** for configuration, never hardcode

## Next Steps

- [ ] Add unit tests for individual tools
- [ ] Add integration tests for flows
- [ ] Set up CI/CD to run tests
- [ ] Create flow documentation
- [ ] Add error handling and validation
- [ ] Implement monitoring and observability

## References

- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Firebase Emulators](https://firebase.google.com/docs/emulator-suite)
- [MCP Protocol](https://modelcontextprotocol.io/)
