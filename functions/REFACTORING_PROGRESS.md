# FlipFeeds Backend Refactoring Progress

## 🎯 Executive Summary

This refactoring transforms the FlipFeeds backend from a brittle, manual architecture into a modern, secure, tool-centric system that supports:

1. **FlipFeeds Mobile/Web Apps** - Using Firebase Callable Functions (`onCallGenkit`)
2. **AI Agents (Claude, etc.)** - Using MCP Server endpoints with OAuth
3. **Future Integrations** - Apps SDK - Our framework to build apps for ChatGPT. - https://developers.openai.com/apps-sdk

### Key Innovation: Context-Only Authentication Pattern

We use **the same tool version** to support both use cases, because our MCP auth will still be firebase auth. The critical security insight is:

**🔒 Security First: UID ONLY from Context**

Tools must **NEVER** accept `uid` as an input parameter. This prevents impersonation attacks where a malicious client or confused LLM could pass any uid to act as another user.

**MUST HAVE GREAT OBSERVABILITY**
You absolutely must put a robust logging into every tool, flow, server. Use Cloud Logging EVERYWHERE, make sure it works when logging in emulators too. See LOGGING.md file!

**The Pattern (secure context-only authentication):**

- **Tools** - ALWAYS extract uid from `context.auth` (never from input)
- **MCP Clients** - Authenticate via OAuth → Firebase sets `context.auth` → tools read from context
- **Flows** - Already have authenticated context → tools read from context
- **Single Source of Truth** - `context.auth.uid` is the ONLY way to know who the user is

**Correct Pattern (secure context-only):**
```typescript
// Tool NEVER accepts uid in input - ONLY from context
export const updateUserProfileTool = ai.defineTool({
  inputSchema: z.object({
    // NO uid parameter - security risk!
    updates: z.object({...})
  }),
}, async (input, { context }) => {
  // ONLY source of uid is context.auth
  const uid = context?.auth?.uid;
  if (!uid) throw new Error('Unauthorized: No authenticated user in context');
  
  // Now we know uid is authentic - it came from Firebase Auth
  await db.collection('users').doc(uid).update(input.updates);
});

// Flow calls - tool reads uid from context
export const conversationalProfileFlow = ai.defineFlow(..., 
  async (input, { context }) => {
    // No uid passed - tool gets it from context
    await updateUserProfileTool({ 
      updates: {...} 
    });
  }
);

// MCP client calls - uid comes from context.auth (set by Firebase Auth)
// Claude calls: updateUserProfileTool({ updates: {...} })
// Firebase Auth middleware sets context.auth before tool executes
```

This pattern allows:
- ✅ FlipFeeds app to use Firebase Auth seamlessly via `onCallGenkit` → flows → tools
- ✅ AI agents (MCP clients) authenticate via OAuth → Firebase sets context → tools read context
- ✅ **Zero impersonation risk** - uid can ONLY come from authenticated context
- ✅ Single tool implementation - always reads from `context.auth.uid`
- ✅ Type-safe, secure authentication everywhere
- ✅ Tools are reusable and testable
- ✅ No duplicate tool versions needed!

## Completed Tasks

### 1. Authentication Context Provider (Already Exists!)
**File:** `functions/src/auth/contextProvider.ts`

The authentication infrastructure is already built and working:
- `authenticateRequest()` - Implements dual-authentication strategy:
  1. First attempts OAuth 2.1 JWT verification
  2. Falls back to Firebase ID Token verification
- Provides `FlipFeedsAuthContext` to flows via `context.auth`
- Helper functions:
  - `requireAuth(context)` - Require authenticated user, returns auth context
  - `requireUser(expectedUid)` - Require specific user

**Key Features:**
- ✅ Already integrated with flows via Genkit context provider
- ✅ Supports both OAuth and Firebase ID tokens
- ✅ Type-safe with full TypeScript support
- ✅ Working examples in `userFlows.ts` and `updateUserProfileTool`

**Note:** The `authWrapper.ts` created earlier can be removed - we follow the simpler pattern where 
When you use onCallGenkit, context.auth is returned as an object with a uid for the user ID, and a token that is a DecodedIdToken. You can always retrieve this object at any time using ai.currentContext() as noted earlier. 

### 2. Feed Management Tools (IN PROGRESS - Need Refactoring)
**File:** `functions/src/tools/feedTools.new.ts`

Need to refactor these tools to follow the single-tool pattern (take explicit `uid` parameter):
- `createFeedTool` - Should take `{ uid, name, description, ... }`
- `getFeedDetailsTool` - Should take `{ uid, feedId }`
- `listPublicFeedsTool` - Can be public (no uid needed)
- `joinFeedTool` - Should take `{ uid, feedId }`
- `generateFlipLinkTool` - Should take `{ uid, feedId, ... }`
- `updateFeedSettingsTool` - Should take `{ uid, feedId, updates }`
- `getPersonalFeedTool` - Should take `{ uid }`
- `listMyFeedsTool` - Should take `{ uid }`

**Pattern to Follow:**
```typescript
export const createFeedTool = ai.defineTool(
  {
    name: 'createFeed',
    inputSchema: z.object({
      // NO uid parameter - prevents impersonation attacks
      name: z.string(),
      description: z.string().optional(),
      // ... other fields
    }),
    outputSchema: z.object({ feedId: z.string() }),
  },
  async (input, { context }) => {
    // ONLY get uid from authenticated context
    const uid = context?.auth?.uid;
    if (!uid) throw new Error('Unauthorized: No authenticated user');
    
    // Now safe to use uid - we know it's authentic
    // Check permissions using uid
    // Implement business logic
    return { feedId: 'feed_123' };
  }
);
```

**Security Features:**
- Role-based access control (admin, moderator, member)
- Subscription tier enforcement (Free = 3 feeds, Pro = unlimited)
- Visibility rules (public vs private vs personal)
- Permission checks before all mutations

### 3. AI & Moderation Tools (DONE)
**File:** `functions/src/tools/aiTools.ts`

Created AI-powered tools:
- `generateTitleForFlipTool` - AI-generated video titles
- `summarizeVideoTool` - Video summarization
- `moderateTextTool` - Text content moderation (internal, no auth)
- `moderateImageTool` - Image moderation (placeholder)
- `generateContentIdeasTool` - Content brainstorming
- `searchVideoContentTool` - Semantic video search (placeholder)

**Key Design:**
- Moderation tools are internal (no auth) - can be called by other tools
- All use Genkit's `ai.generate()` with structured outputs
- Fail-open strategy for moderation (allow on error)
- Configurable parameters (max length, count, etc.)

## 🚧 Remaining Tasks

### 4. Flip (Video) Content Tools
**File:** `functions/src/tools/flipTools.ts` (needs refactoring)

**Required Tools (Single Tool Pattern - take explicit `uid`):**

```typescript
// Secure tool - NO uid in input, ONLY from context
export const createFlipTool = ai.defineTool({
  inputSchema: z.object({
    // NO uid - prevents impersonation
    feedId: z.string(),
    videoUrl: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
  outputSchema: z.object({ flipId: z.string() }),
}, async (input, { context }) => {
  // ONLY get uid from authenticated context
  const uid = context?.auth?.uid;
  if (!uid) throw new Error('Unauthorized');
  
  // 1. Check feed membership for uid (from context)
  // 2. Call moderateTextTool for title/description
  // 3. Create flip in Firestore
  // 4. Update feed stats
  return { flipId: '...' };
});

// Flow calls - tool reads uid from context
export const createFlipFlow = ai.defineFlow(..., 
  async (input, { context }) => {
    // No uid passed - tool gets from context
    return await createFlipTool({
      feedId: input.feedId,
      videoUrl: input.videoUrl,
      title: input.title,
      description: input.description,
    });
  }
);
```

**Tools Needed:**
- `createFlipTool({ feedId, ... })` - Create new flip with moderation
- `getFlipTool({ flipId })` - Get flip details
- `getFlipsForFeedTool({ feedId })` - List flips in a feed
- `getPersonalFeedFlipsTool()` - List user's personal flips
- `deleteFlipTool({ flipId })` - Delete flip (with permission check)
- `updateFlipTool({ flipId, updates })` - Update flip metadata

**Implementation Notes:**
- Tools **NEVER** accept `uid` in input - security risk!
- Tools ALWAYS extract uid from `context.auth.uid` only
- Both flows and MCP clients rely on context for authentication
- MCP clients authenticate via OAuth → Firebase sets context
- Must call `moderateTextTool` before creating flips
- Check feed membership using uid from context
- Handle video upload URL generation
- Update feed stats on create/delete

### 5. User Management Tools
**File:** `functions/src/tools/userTools.ts` (mostly done!)

**Existing Tools (NEED TO UPDATE to Secure Context-Only Pattern):**
- ⚠️ `getUserProfileTool({ uid })` - **INSECURE** - Remove uid parameter
- ⚠️ `updateUserProfileTool({ uid, updates })` - **INSECURE** - Remove uid parameter
- ✅ `isUsernameAvailableTool({ username })` - Public tool, no auth needed
- ⚠️ `claimUsernameTool({ uid, username })` - **INSECURE** - Remove uid parameter
- ⚠️ `releaseUsernameTool({ username })` - Needs uid from context for authorization
- ⚠️ `createUserProfileTool({ uid, ... })` - **INSECURE** - Remove uid parameter
- ⚠️ `getUserFeedsTool({ uid })` - **INSECURE** - Remove uid parameter

**TODO:**
- Remove ALL `uid` parameters from input schemas - prevents impersonation
- Always extract uid from `context.auth.uid` only
- Ensure `createUserProfileTool` creates the personal feed automatically
- Personal feed ID: `personal_{userId}`
- Username must be unique (check against reserved collection)

**Pattern Update Needed:**
```typescript
// BEFORE (INSECURE - accepts uid from input)
inputSchema: z.object({
  uid: z.string(),  // ❌ Security risk!
  // ... other fields
})

// AFTER (SECURE - uid only from context)
inputSchema: z.object({
  // NO uid parameter
  // ... other fields
}),
async (input, { context }) => {
  // ONLY source of truth for authentication
  const uid = context?.auth?.uid;
  if (!uid) throw new Error('Unauthorized');
  // ... rest of logic
}
```

### 6. Feed Apps Platform Tools
**File:** `functions/src/tools/appTools.ts` (NEW)

**Required Tools:**
```typescript
- registerFeedAppTool - Register external MCP endpoint (Pro tier only)
- listFeedAppsTool - List registered apps for a feed
- triggerFeedAppTool - Internal: call external MCP server
- removeFeedAppTool - Unregister an app
```

**Implementation Notes:**
- Check Pro tier subscription before allowing registration
- Store: feedId, appName, mcpEndpoint, triggerCommand, apiKey
- `triggerFeedAppTool` makes HTTP call to external MCP server

### 7. Tool Suites (Organization)
**Files:** 
- `functions/src/tools/public.ts` (NEW)
- `functions/src/tools/user.ts` (NEW)
- `functions/src/tools/admin.ts` (NEW)

**Purpose:** Group EXTERNAL tools (with authToken) by access level for MCP server endpoints

**IMPORTANT:** Only include external tools (those with authToken) in these suites.
Internal tools (for flows) are not exposed via MCP.

**public.ts** - No auth required or public access:
```typescript
import { listPublicFeedsTool } from './feedTools';

// Only external tools - these will be called by MCP clients
export const publicTools = [
  listPublicFeedsTool, // External version
  // Add more public-facing external tools
];
```

**user.ts** - Authenticated user tools:
```typescript
import { createFeedTool, joinFeedTool } from './feedTools';
import { createFlipTool, getFlipTool } from './flipTools';
import { generateTitleForFlipTool, summarizeVideoTool } from './aiTools';

// Only external tools with authToken - for MCP clients
export const userTools = [
  // Feed tools
  createFeedTool,           // External version
  joinFeedTool,             // External version
  
  // Flip tools
  createFlipTool,           // External version
  getFlipTool,              // External version
  
  // AI tools
  generateTitleForFlipTool, // External version
  summarizeVideoTool,       // External version
  
  // ... all user-facing authenticated external tools
];
```

**admin.ts** - Admin-only tools:
```typescript
export const adminTools = [
  // Future: deleteUserTool, banUserTool, etc.
  // Only external versions for MCP access
];
```

**internal.ts** - Internal tools for flows (NOT exported via MCP):
```typescript
import { createFlipInternal, getFlipInternal } from './flipTools';
import { createFeedInternal } from './feedTools';

// These tools are ONLY for use in flows
// They use context.auth instead of authToken
// They are NOT exposed via mcpServer
export const internalTools = {
  createFlip: createFlipInternal,
  getFlip: getFlipInternal,
  createFeed: createFeedInternal,
  // ... etc
};
```

### 8. Refactor Flows to be Lean Orchestrators
**Files:** `functions/src/flows/*.ts`

**Strategy:**
- Keep flow files but simplify them dramatically
- Flows should just call tools in sequence
- Flows do NOT need authToken in their input - auth is handled by `onCallGenkit`
- Flows use `requireAuth(context)` to get uid, then pass it to tools

**Pattern (Already Used in `userFlows.ts`):**
```typescript
// flows/flipFlows.ts

export const createFlipFlow = ai.defineFlow(
  {
    name: 'createFlip',
    inputSchema: z.object({
      feedId: z.string(),
      videoUrl: z.string(),
      description: z.string().optional(),
    }),
    outputSchema: z.object({ 
      success: z.boolean(), 
      flipId: z.string().optional() 
    }),
  },
  async (input, { context }) => {
    // Get authenticated user's uid from context
    const auth = requireAuth(context);
    
    // 1. Optional: Generate title using AI
    let title = input.description || 'Untitled Flip';
    if (input.description) {
      const titleResult = await generateTitleForFlipTool({
        description: input.description,
      });
      title = titleResult.primary;
    }

    // 2. Call tool with explicit uid
    const result = await createFlipTool({
      uid: auth.uid,  // Pass uid from authenticated context
      feedId: input.feedId,
      videoUrl: input.videoUrl,
      title,
    });
    
    return { success: true, flipId: result.flipId };
  }
);
```

**Then export as callable function:**
```typescript
// index.ts
export const createFlip = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  createFlipFlow
);
```

**Key Points:**
- ✅ Single tool implementation (takes `uid` parameter)
- ✅ Flows use `requireAuth(context)` to get uid
- ✅ MCP clients call tools directly with uid
- ✅ No duplication, no complexity
- ✅ Pattern already proven in `conversationalProfileFlow`

### 9. Update index.ts
**File:** `functions/src/index.ts`

**Required Changes:**

```typescript
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { mcpServer } from '@genkit-ai/firebase/functions';
import { defineSecret } from 'firebase-functions/params';
import { publicTools } from './tools/public';
import { userTools } from './tools/user';
import { adminTools } from './tools/admin';

// Import all flows (they're defined in flow files)
import { newFlipCreationFlow } from './flows/flipFlows';
import { createFeedFlow } from './flows/feedFlows';
import { generatePoemFlow } from './flows/generatePoemFlow';
// ... etc

// Define secrets needed by flows
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ============================================================================
// CALLABLE FUNCTIONS (for FlipFeeds app) - Using onCallGenkit
// ============================================================================

/**
 * Create a new flip (video post)
 * Requires: authenticated user with verified email
 */
export const createFlip = onCallGenkit(
  {
    secrets: [geminiApiKey], // If flow uses AI for title generation
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true, // Recommended for production
  },
  newFlipCreationFlow
);

/**
 * Create a new feed
 * Requires: authenticated user with verified email
 */
export const createFeed = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  createFeedFlow
);

/**
 * Generate a poem (example flow)
 * Requires: authenticated user
 */
export const generatePoem = onCallGenkit(
  {
    secrets: [geminiApiKey],
    authPolicy: (auth) => !!auth?.uid, // Just require authentication
    enforceAppCheck: false, // Can be disabled for testing
  },
  generatePoemFlow
);

// Export all other flows similarly...
// Each flow should have appropriate auth policy and App Check settings

// ============================================================================
// MCP SERVER ENDPOINTS (for AI agents & ecosystem)
// ============================================================================

/**
 * Public MCP endpoint - for unauthenticated or public tools
 * Use case: Discovery, public feed browsing
 */
export const publicMcpEndpoint = mcpServer({
  name: 'publicMcp',
  tools: publicTools,
});

/**
 * User MCP endpoint - for authenticated user tools
 * Use case: Claude Desktop, VSCode extensions, etc.
 * Note: These tools still require authToken in their input
 */
export const userMcpEndpoint = mcpServer({
  name: 'userMcp',
  tools: userTools,
});

/**
 * Admin MCP endpoint - for admin-only tools
 * Use case: Internal management tools
 * Note: Should add IAM restrictions in Firebase Console
 */
export const adminMcpEndpoint = mcpServer({
  name: 'adminMcp',
  tools: adminTools,
});

// ============================================================================
// OAUTH ENDPOINTS (for MCP clients like Claude Desktop)
// ============================================================================

// Keep OAuth endpoints for MCP authentication
export { mcpAuthServer } from './auth/authServer';
export { mcpProtectedResource } from './auth/protectedResource';
```

**Important Architectural Notes:**

1. **Two Authentication Patterns:**
   - **Callable Functions (`onCallGenkit`)**: Auth handled by Firebase Functions automatically
     - Client doesn't send authToken
     - Flow receives authenticated context
     - Best for mobile/web app
   
   - **MCP Server Tools**: Auth handled by tool wrapper manually
     - Client sends authToken in request
     - Tool verifies token (OAuth or Firebase)
     - Best for AI agents (Claude, etc.)

2. **Why Both Patterns?**
   - FlipFeeds app uses Firebase Auth SDK → calls functions → automatic auth
   - Claude Desktop uses OAuth → calls MCP tools → manual auth with token
   - Each pattern is optimized for its use case

3. **Configuration Options:**
   ```typescript
   onCallGenkit({
     secrets: [apiKey],              // Secrets function needs
     authPolicy: hasClaim('role'),   // Who can call this
     enforceAppCheck: true,          // Verify calls from your app
     consumeAppCheckToken: true,     // Extra security (slower)
     cors: 'mydomain.com',           // CORS policy (optional)
   }, flowDefinition)
   ```

### 10. Testing & Validation

**Manual Testing:**
1. Test OAuth flow with curl
2. Test Firebase ID Token with app
3. Test tool authentication rejection
4. Test subscription tier limits
5. Test role-based permissions
6. Test MCP server endpoints with Claude Desktop

**Unit Tests (Future):**
- Test `defineAuthenticatedTool` wrapper
- Test permission checking functions
- Test tier limit enforcement
- Mock Firestore for tool tests

## 📋 Migration Checklist

### Phase 1: Core Infrastructure
- [ ] Make sure that mcp to tool calls and `onCallGenkit` both work to add auth context
- [ ] Create new `userTools` with authentication, we will focus on getting this right using firebase functions and mcp first!

### Phase 1.1: Get Users right
- [ ] Refactor `userTools.ts` and validate `userFlows`:
  - [ ] Remove ALL `uid` parameters from input schemas
  - [ ] Add context-only uid extraction to all tools
  - [ ] Verify no uid can be passed from input

### Phase 2: Implement Secure Context-Only Pattern
- [ ] Create `flipTools.ts`:
  - [ ] Add uid extraction: `const uid = context?.auth?.uid;`
  - [ ] Test with both flow calls and MCP direct calls
  - [ ] Verify security
- [ ] Create `feedTools.ts`:
  - [ ] Add context-only uid extraction
  - [ ] Test both calling patterns
  - [ ] Verify security

### Phase 3: Organization & Flows
- [ ] Create tool suite files:
  - [ ] `userTools.ts` - User-level tools for users (context-aware)
  - [ ] `feedTools.ts` - User-level tools for creating feeds, users create feeds (context-aware)
  - [ ] `flipTools.ts` - User-level tools for creating flips, exist in feeds (context-aware)

### Phase 4: Deployment Configuration
- [ ] Update `index.ts`:
  - [ ] Use `onCallGenkit` to export flows as callable v2 functions
  - [ ] Use `mcpServer` and create as many as needed per set of tools
  - [ ] Add auth policies to all flows
- [ ] Remove old custom MCP server code that creates MCP tools from genkit flow definitions
- [ ] Update environment variables and secrets

### Phase 5: Testing & Validation
- [ ] Test callable functions:
  - [ ] From mobile app with Firebase Auth
  - [ ] From web app with Firebase Auth
  - [ ] Verify auth policies work
  - [ ] Test App Check enforcement
- [ ] Test MCP endpoints:
  - [ ] From Claude Desktop with OAuth
  - [ ] From custom MCP client
  - [ ] Verify dual auth works (OAuth + Firebase)
- [ ] Test error cases:
  - [ ] Invalid tokens
  - [ ] Expired tokens
  - [ ] Missing permissions
  - [ ] Rate limiting

### Phase 6: Production Readiness
- [ ] Set up App Check for production
- [ ] Configure proper IAM roles for admin endpoints
- [ ] Set up monitoring and logging
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Update client SDKs/documentation

## 🎯 Next Immediate Steps

1. **Backup and refactor flipTools.ts** - Similar to feedTools
2. **Backup and refactor userTools.ts** - Add personal feed creation
3. **Create appTools.ts** - New file for Feed Apps platform
4. **Create tool suite files** - Organize by access level
5. **Simplify flows** - Make them thin orchestrators
6. **Update index.ts** - New endpoint architecture
7. **Test thoroughly** - Both auth methods, all tools

## 📚 Key Architectural Decisions

1. **Tools are the Source of Truth** - All business logic in tools
2. **🔒 Context-Only Authentication** - UID ONLY from `context.auth.uid`, NEVER from input
3. **Zero Impersonation Risk** - Tools cannot accept uid parameter (security)
4. **MCP Calls Tools Directly** - MCP clients call tools directly (not through flows)
5. **Same Authentication Source** - Both flows and MCP use `context.auth` for uid
6. **Firebase Auth Middleware** - OAuth flow → Firebase token → context.auth set before tool execution
7. **Multiple MCP Endpoints** - Separate by access level to avoid prompt bloat
8. **Dual Auth Strategy** - Support both OAuth (MCP) and Firebase Auth (app) seamlessly
9. **Fail-Open Moderation** - Allow content if moderation service fails
10. **Role-Based Access** - Check permissions in tools, not rules
11. **Tier-Based Limits** - Enforce at tool level, not client side

## 🔄 Understanding the Single-Tool Dual-Client Architecture

FlipFeeds uses **the same tools** to support both mobile/web apps and AI agents (MCP clients). 

### Critical Architecture Insight

**MCP clients call tools DIRECTLY** (not through flows). This is because:
- MCP protocol exposes individual tools as capabilities
- AI agents (Claude, ChatGPT) call specific tools by name
- Flows are only for mobile/web app (via callable functions)
- MCP = Direct tool access, No flows involved

**🔒 Critical Security Requirement:**

Tools must **NEVER** accept `uid` as an input parameter. This would allow impersonation attacks. Instead:
1. MCP clients authenticate via OAuth → Firebase sets `context.auth`
2. Tools ONLY read from `context.auth.uid`
3. Single source of truth prevents impersonation
4. Both MCP and flows use the same authentication mechanism

### Pattern 1: Callable Functions (for FlipFeeds App)
```
┌─────────────┐
│ Mobile/Web  │
│    App      │
└──────┬──────┘
       │ 1. User signs in with Firebase Auth
       │ 2. App calls function (no manual token)
       ▼
┌──────────────────┐
│  onCallGenkit()  │ ◄── Automatically extracts Firebase Auth
│                  │     from request headers
└────────┬─────────┘
         │ 3. Provides auth context to flow
         ▼
   ┌──────────┐
   │   Flow   │ ◄── Has authenticated context
   └────┬─────┘
        │ 4. Calls tool({ ...params }) (no uid needed)
        ▼
  ┌──────────┐
  │   Tool   │ ◄── Reads uid from context.auth.uid
  └──────────┘     Executes logic with uid
```

**Client Code (React Native/Web):**
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// User is already signed in with Firebase Auth
const createFlipFn = httpsCallable(getFunctions(), 'createFlip');

// NO authToken or uid needed - Firebase SDK handles it
const result = await createFlipFn({
  feedId: 'feed123',
  videoUrl: 'https://...',
  description: 'My cool video'
});
```

**Benefits:**
- Zero boilerplate for developers
- Automatic token refresh
- Built-in error handling
- App Check integration
- Type-safe with Firebase SDK

### Pattern 2: MCP Direct Tool Calls (for AI Agents)
```
┌──────────────┐
│ Claude/Agent │
└──────┬───────┘
       │ 1. Authenticates via OAuth → gets Firebase token
       │ 2. Extracts uid from token
       │ 3. Calls tool DIRECTLY with explicit uid
       ▼
┌─────────────┐
│ mcpServer() │ ◄── Exposes tools to MCP clients
└──────┬──────┘
       │ 4. Routes to tool (DIRECT CALL - no flow)
       ▼
  ┌──────────┐
  │   Tool   │ ◄── Reads uid from input.uid parameter
  └──────────┘        Executes logic (same tool as Pattern 1!)
```

**Client Code (Claude Desktop MCP Config):**
This will use the MCP server and correctly generate dynamic client registration (this is already happening), it uses firebase auth so that the correct user auth is available in the context.
```json
{
  "mcpServers": {
    "flipfeeds": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-flipfeeds"],
    }
  }
}
```

**Tool Call (from Claude):**
```typescript
// Claude calls tool WITHOUT uid (comes from context)
{
  "method": "tools/call",
  "params": {
    "name": "createFeed",
    "arguments": {
      "name": "My New Feed",
      "visibility": "private"
    }
  }
}

// Behind the scenes:
// 1. Claude authenticated via OAuth → got Firebase token
// 2. Firebase middleware validates token → sets context.auth
// 3. Tool reads uid from context.auth.uid
// 4. Tool executes with authenticated uid
```

**Benefits:**
- Works with any MCP client
- Same tools as mobile/web app
- No duplication of business logic
- AI agents can act on behalf of users

### Why Two Access Patterns?

| Use Case | Access Pattern | Auth Source |
|----------|----------------|-------------|
| FlipFeeds mobile app | onCallGenkit + Flow | Firebase SDK (automatic) |
| FlipFeeds web app | onCallGenkit + Flow | Firebase SDK (automatic) |
| Claude Desktop | MCP Direct Tool Call | Firebase token (manual) |
| Custom AI agents | MCP Direct Tool Call | Firebase token (manual) |
| ChatGPT Actions | MCP Direct Tool Call | OAuth → Firebase token |
| Internal scripts | Either | Choose based on needs |

**Where UID Comes From**

**Callable Functions (`onCallGenkit`):**
- Auth verification: Firebase Functions (automatic)
- Auth policy: Declarative in function definition
- UID source: `context.auth.uid` (set by Firebase Auth)
- Tool receives: No uid parameter (reads from `context.auth.uid`)

**MCP Tools (direct calls - NO FLOW):**
- Auth verification: OAuth → Firebase token → context.auth set
- Auth policy: Enforced by Firebase Auth middleware
- UID source: `context.auth.uid` (set by Firebase Auth)
- Tool receives: No uid parameter (reads from `context.auth.uid`)

**🔒 Critical Security Insight:** 

Tools ALWAYS read from the SAME source:
```typescript
// ONLY source of truth
const uid = context?.auth?.uid;
if (!uid) throw new Error('Unauthorized');
```
- Flow calls: uid from `context.auth` (Firebase Functions)
- MCP calls: uid from `context.auth` (Firebase Auth middleware)
- **Same tool, same uid source, zero impersonation risk!**

## 🔒 Security Principles

### 🚨 CRITICAL: Authentication Security

**NEVER accept `uid` as an input parameter in tools!**

This would allow impersonation attacks where a malicious client or confused LLM could pass any uid to act as another user.

**Correct Pattern:**
```typescript
// ✅ SECURE
inputSchema: z.object({
  // NO uid parameter
}),
async (input, { context }) => {
  const uid = context?.auth?.uid;  // ONLY source of truth
  if (!uid) throw new Error('Unauthorized');
}

// ❌ INSECURE - DO NOT DO THIS
inputSchema: z.object({
  uid: z.string(),  // Allows impersonation!
})
```

### Other Security Principles

- **Context is source of truth** - Always use `context.auth.uid` for authentication
- **Check permissions early** - Before any database operations
- **Audit all actions** - Log who did what when
- **Respect visibility rules** - Public vs private vs personal
- **Rate limit** - Use Firebase Functions rate limiting
- **Sanitize inputs** - Validate with Zod schemas
- **Fail secure** - Deny access on error, except moderation

---

## 📖 Quick Reference Guide

### Creating a New Tool (Single Pattern)

**Step 1: Define Secure Context-Only Tool**
```typescript
// tools/myTools.ts
export const myActionTool = ai.defineTool(
  {
    name: 'myAction',
    description: 'Does something cool',
    inputSchema: z.object({
      // NO uid parameter - prevents impersonation attacks
      param: z.string(),
    }),
    outputSchema: z.object({ result: z.string() }),
  },
  async (input, { context }) => {
    // ONLY get uid from authenticated context
    const uid = context?.auth?.uid;
    if (!uid) throw new Error('Unauthorized: No authenticated user');
    
    // uid is guaranteed authentic - came from Firebase Auth
    // Validate permissions
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) throw new Error('User not found');
    
    // Execute business logic
    const result = await doSomething({ ...input, uid });
    
    return { result };
  }
);
```

**Step 2: Call from Flow (FlipFeeds App)**
```typescript
// flows/myFlows.ts
export const myActionFlow = ai.defineFlow(
  {
    name: 'myAction',
    inputSchema: z.object({ param: z.string() }),
    outputSchema: z.object({ result: z.string() }),
  },
  async (input, { context }) => {
    // Just call tool - it reads uid from context
    // No need to pass uid (and we can't - security!)
    return await myActionTool({
      param: input.param,
    });
  }
);
```

**Step 3: Export as Callable Function**
```typescript
// index.ts
export const myAction = onCallGenkit(
  {
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
  },
  myActionFlow
);
```

**Step 4: Export Tool for MCP**
```typescript
// index.ts
export const mcp = mcpServer({
  tools: [
    myActionTool,  // Same tool!
    // ... other tools
  ],
});
```

### Calling from Mobile App

```typescript
// Mobile/Web app
import { getFunctions, httpsCallable } from 'firebase/functions';

const myActionFn = httpsCallable(getFunctions(), 'myAction');
const result = await myActionFn({ param: 'hello' });
// No uid needed - Firebase SDK handles auth
// Flow has context, tool reads from context.auth.uid
```

### Calling from Claude (MCP) - DIRECT TOOL CALL

```typescript
// Claude calls tool DIRECTLY (not through a flow!)
{
  "method": "tools/call",
  "params": {
    "name": "myAction",
    "arguments": {
      // NO uid - comes from context.auth (set by Firebase Auth)
      "param": "hello"
    }
  }
}

// What happens behind the scenes:
// 1. Claude authenticated via OAuth → has Firebase token
// 2. Firebase Auth middleware validates token
// 3. Middleware sets context.auth = { uid: "...", ... }
// 4. Tool reads uid from context.auth.uid
// 5. Tool executes securely with authenticated uid

// 🔒 Security: Even if Claude tried to pass uid, tool would ignore it!
```

### Common Patterns

**Check User Permission:**
```typescript
const permission = await checkFeedPermission(feedId, uid, 'admin');
if (!permission.allowed) {
  throw new Error('Permission denied');
}
```

**Check Subscription Tier:**
```typescript
const tier = getSubscriptionTier(authContext);
if (tier !== 'pro') {
  throw new Error('Pro tier required');
}
```

**Moderate Content:**
```typescript
const moderation = await moderateTextTool({ 
  text: userInput,
  context: 'title'
});
if (moderation.suggestedAction === 'block') {
  throw new Error('Content violates guidelines');
}
```

---

This refactoring transforms FlipFeeds from a brittle, manual backend into a modern, secure, tool-centric architecture that's ready for both app consumption and ecosystem integration.
