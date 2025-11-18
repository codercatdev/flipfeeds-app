# Flow Refactoring Complete ✅

## Summary

Successfully refactored all FlipFeeds flows to use `ai.generate()` with implicit tool calling, following Genkit best practices and Firebase-first philosophy.

## Changes Made

### 1. Model Configuration ✅
- **Updated default model** to `googleai/gemini-2.5-flash-lite` (ultra-fast & cost-efficient)
- **Available models**:
  - `googleai/gemini-2.5-flash` - Stable, fast (main AI flows)
  - `googleai/gemini-2.5-flash-lite` - Ultra-fast, cost-efficient (simple flows)
  - `googleai/gemini-2.5-pro` - Powerful reasoning (complex tasks)
  - `vertexai/imagen-3.0-fast-generate-001` - Image generation

### 2. User Flows Refactored ✅

#### `conversationalProfileFlow` (userFlows.ts)
- **Before**: 280+ lines of manual if/else logic, direct tool calls
- **After**: ~70 lines using `ai.generate()` with tools
- **Tools used**: `getUserProfile`, `createUserProfile`, `updateUserProfile`, `isUsernameAvailable`, `claimUsername`, `releaseUsername`
- **Model**: `googleai/gemini-2.5-flash`
- **Benefit**: LLM handles conversational logic, automatically calls right tools

#### `updateProfileFieldFlow` (userFlows.ts)
- **Before**: 180+ lines of manual validation logic
- **After**: ~60 lines using `ai.generate()` with tools
- **Tools used**: Same as conversationalProfileFlow
- **Model**: `googleai/gemini-2.5-flash`
- **Benefit**: AI-powered validation and intelligent error handling

#### `profileImageAssistantFlow` (userFlows.ts)
- **Updated**: Image generation now uses `ai.generate()` with `vertexai/imagen-3.0-fast-generate-001`
- **Before**: Used `vertexAI.model()` directly
- **After**: Proper `ai.generate()` pattern
- **Generates**: 3 image variations in parallel for user selection

### 3. Feed Tools Created ✅

Created `functions/src/tools/feedTools.ts` with:

- **`createFeed`**: Create new feed with auto-owner assignment
- **`getFeed`**: Get feed by ID (respects visibility/membership)
- **`listUserFeeds`**: List all feeds user is a member of
- **`addMemberToFeed`**: Add member (admin/moderator only)
- **`removeMemberFromFeed`**: Remove member (self or admin)

**Security**: All tools respect Firestore security rules:
- Feed creation bypasses client rules (admin SDK)
- Visibility checks (public vs private)
- Membership verification
- Role-based access control

### 4. Feed Flows Refactored ✅

Created `functions/src/flows/feedFlows.ts`:

#### `createFeedFlow`
- **Uses**: `ai.generate()` with `createFeed` tool
- **Model**: `googleai/gemini-2.5-flash-lite`
- **Benefit**: AI-assisted validation

#### `getUserFeedsFlow`
- **Uses**: `ai.generate()` with `listUserFeeds` tool
- **Model**: `googleai/gemini-2.5-flash-lite`
- **Returns**: All feeds user is a member of

### 5. Video Tools Created ✅

Created `functions/src/tools/videoTools.ts` with:

- **`moderateVideo`**: AI-powered content moderation
  - Checks for violence, hate speech, adult content, dangerous activities
  - Returns safety assessment with reasons
  
- **`generateVideoSummary`**: AI-generated video summary
  - 2-3 sentences, concise and engaging
  - Under 200 characters for social media
  
- **`generateVideoTitle`**: AI-generated video title
  - 5-10 words, attention-grabbing
  - Uses summary context if provided
  - Avoids clickbait

**All use `googleai/gemini-2.5-flash` for analysis**

### 6. Flip Tools Created ✅

Created `functions/src/tools/flipTools.ts` with:

- **`createFlip`**: Create flip in multiple feeds
  - Verifies feed membership
  - Updates flip counts atomically
  - Supports multi-feed sharing
  
- **`getFlip`**: Get flip by ID
  - Requires membership in at least one feed
  - Security checked
  
- **`getFeedFlips`**: List flips for a feed
  - Paginated (max 100)
  - Ordered by creation date
  - Membership required
  
- **`deleteFlip`**: Delete flip
  - Author or feed admin only
  - Atomic flip count updates

**Security**: All tools respect Firestore rules and implement proper authorization

### 7. Flip Flows Refactored ✅

Created `functions/src/flows/flipFlows.ts`:

#### `createFlipFlow`
- **Uses**: `ai.generate()` with multiple tools
- **Model**: `googleai/gemini-2.5-flash`
- **Workflow**:
  1. Moderate video (`moderateVideo`)
  2. If unsafe, return error with reasons
  3. If safe, generate summary (`generateVideoSummary`)
  4. Generate title if not provided (`generateVideoTitle`)
  5. Create flip (`createFlip`)
  
- **Returns**: `flipId`, `title`, `summary`, `moderationResult`

#### `getFeedFlipsFlow`
- **Uses**: `ai.generate()` with `getFeedFlips` tool
- **Model**: `googleai/gemini-2.5-flash-lite`
- **Returns**: Paginated list of flips

### 8. Architecture Improvements ✅

#### Before:
```typescript
// Manual tool calls
const profile = await getUserProfileTool({}, { auth: context?.auth });
if (!profile) {
  await createUserProfileTool(...);
  // 200+ lines of if/else logic
}
```

#### After:
```typescript
// AI-powered tool orchestration
const result = await ai.generate({
  model: 'googleai/gemini-2.5-flash',
  prompt: `...detailed instructions...`,
  tools: ['getUserProfile', 'createUserProfile', ...],
  output: { schema: ... },
});
```

**Benefits**:
- **60-80% code reduction** in flows
- **Intelligent tool selection** by LLM
- **Better error handling** with natural language
- **More maintainable** - logic in prompts, not code
- **Observable** - Genkit UI shows tool calls
- **Testable** - Tools tested independently

## File Structure

```
functions/src/
├── flows/
│   ├── userFlows.ts       ✅ Refactored (3 flows)
│   ├── feedFlows.ts       ✅ Refactored (2 flows)
│   └── flipFlows.ts       ✅ Refactored (2 flows)
├── tools/
│   ├── index.ts           ✅ Exports all tools
│   ├── userTools.ts       ✅ Existing (6 tools)
│   ├── feedTools.ts       ✅ Created (5 tools)
│   ├── flipTools.ts       ✅ Created (4 tools)
│   └── videoTools.ts      ✅ Created (3 tools)
└── genkit.ts              ✅ Updated (registers all tools & flows)
```

## Tool Registry

Total: **18 tools** registered with Genkit

### User Tools (6)
1. `getUserProfile`
2. `createUserProfile`
3. `updateUserProfile`
4. `isUsernameAvailable`
5. `claimUsername`
6. `releaseUsername`

### Feed Tools (5)
1. `createFeed`
2. `getFeed`
3. `listUserFeeds`
4. `addMemberToFeed`
5. `removeMemberFromFeed`

### Flip Tools (4)
1. `createFlip`
2. `getFlip`
3. `getFeedFlips`
4. `deleteFlip`

### Video Tools (3)
1. `moderateVideo`
2. `generateVideoSummary`
3. `generateVideoTitle`

## Flow Registry

Total: **7 flows** registered

### User Flows (3)
1. `conversationalProfileFlow` - Interactive profile management
2. `updateProfileFieldFlow` - Single field updates with validation
3. `profileImageAssistantFlow` - AI image generation & management

### Feed Flows (2)
1. `createFeedFlow` - Create new feed
2. `getUserFeedsFlow` - List user's feeds

### Flip Flows (2)
1. `createFlipFlow` - Create flip with AI moderation/generation
2. `getFeedFlipsFlow` - List flips for a feed

## Security Implementation

All tools respect Firestore security rules:

- **Authentication**: Required for all operations (via `context.auth.uid`)
- **Authorization**: Role-based (admin, moderator, member)
- **Visibility**: Public/private feed access control
- **Ownership**: Author and admin checks for modifications
- **Membership**: Feed membership verification
- **Personal Feeds**: Owner-only access

## Testing Checklist

- [ ] Test `conversationalProfileFlow` with various user inputs
- [ ] Test username changes (availability, claiming, releasing)
- [ ] Test bio updates
- [ ] Test image generation (3 variations)
- [ ] Test feed creation
- [ ] Test feed membership (add/remove)
- [ ] Test flip creation with moderation
- [ ] Test flip creation with title/summary generation
- [ ] Test flip listing and pagination
- [ ] Test flip deletion (author vs admin)
- [ ] Run full test suite: `pnpm test`
- [ ] Test in Genkit Developer UI: `pnpm genkit:dev`
- [ ] Test in Firebase emulators: `pnpm emulators`

## Next Steps

1. **Update Tests**: Modify `functions/test/*.test.js` to match new flow signatures
2. **Update Documentation**: Update `AGENTS.md` with new patterns
3. **Performance Testing**: Measure latency and cost vs old implementation
4. **Client Integration**: Update web/mobile apps to use new flow outputs
5. **Add More Flows**:
   - `updateFeedFlow` - Update feed metadata
   - `deleteFeedFlow` - Delete feed
   - `updateFlipFlow` - Update flip metadata
   - `inviteMemberFlow` - Invite users to feeds
   - `searchFeedsFlow` - Search public feeds

## Key Learnings

1. **`ai.generate()` is powerful**: Handles complex conversational logic that would take 200+ lines of code
2. **Prompts are code**: Clear, detailed prompts are critical for reliable tool calling
3. **Tools should be atomic**: Each tool does one thing well
4. **Security in tools**: Admin SDK bypasses client rules, so authorization must be in tool logic
5. **Model selection matters**: Use lite for simple ops, flash for complex, pro for reasoning, imagen for images

## Cost Optimization

- **Use `gemini-2.5-flash-lite`** for simple operations (cheap, fast)
- **Use `gemini-2.5-flash`** for complex orchestration (good balance)
- **Use `gemini-2.5-pro`** only when needed (expensive, powerful)
- **Batch operations** where possible (e.g., 3 images in parallel)
- **Cache tool outputs** when appropriate

## References

- [Genkit generate() docs](https://firebase.google.com/docs/genkit/generate)
- [Genkit Tool Calling](https://firebase.google.com/docs/genkit/tool-calling)
- [Vertex AI Imagen](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Firebase Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)
