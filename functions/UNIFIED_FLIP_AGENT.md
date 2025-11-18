# Unified Flip Agent

## Overview
The `flipAgent` is a single, intelligent assistant that consolidates all flip-related functionality previously split across three separate agents:
- ✅ **REPLACED**: `flipCreationAgent` (video flip creation)
- ✅ **REPLACED**: `flipBrowserAgent` (feed browsing)
- ✅ **REPLACED**: `videoGenerationAgent` (AI video generation workflow)

## Benefits of Consolidation
1. **Simpler API**: One agent to call instead of three
2. **Intelligent Routing**: Uses Gemini 2.5 Flash to determine which tools to use based on natural language
3. **Complete Workflows**: Can orchestrate multi-step processes (generate → check → upload → create flip)
4. **Flexible Input**: Natural language requests with optional context parameters
5. **All Tools Available**: Access to 26 tools across all domains (user, feed, flip, video processing, video generation)

## Available Tools (26 Total)

### User Tools (10)
- `getUserProfile` - Get user profile
- `updateUserProfile` - Update profile fields
- `createUsername` - Create unique username
- `checkUsernameAvailability` - Check if username is available
- `updateUsername` - Update username
- `uploadProfileImage` - Upload profile picture
- `uploadBannerImage` - Upload banner image
- `deleteUser` - Delete user account
- `getUserByUsername` - Look up user by username
- `getUserById` - Look up user by ID

### Feed Tools (5)
- `createFeed` - Create new feed
- `getUserFeeds` - Get user's feeds
- `updateFeed` - Update feed details
- `deleteFeed` - Delete a feed
- `manageFeedMembers` - Add/remove feed members

### Flip Tools (4)
- `createFlip` - Create new flip/post
- `getFeedFlips` - Browse flips in a feed
- `deleteFlip` - Delete a flip
- `moderateFlip` - Check flip safety

### Video Processing Tools (3)
- `moderateVideo` - AI safety check
- `generateVideoSummary` - AI content summary
- `generateVideoTitle` - AI title generation

### Video Generation Tools (4)
- `generateVerticalVideo` - Start AI video generation (Veo 3.1)
- `checkVideoGeneration` - Poll generation status
- `uploadGeneratedVideo` - Upload to Firebase Storage
- `listVideoGenerationJobs` - List user's jobs

## Usage Examples

### Example 1: Create Flip from Existing Video
```typescript
const result = await flipAgent({
  request: "Create a flip from my video and share to my family feed",
  videoStoragePath: "videos/user123/my-video.mp4",
  feedIds: ["feed_family_abc"],
  title: "My awesome video" // Optional, will auto-generate if omitted
});

// Agent will:
// 1. Call moderateVideo to check safety
// 2. Call generateVideoSummary for description
// 3. Call generateVideoTitle if no title provided
// 4. Call createFlip to publish
```

### Example 2: Generate AI Video and Create Flip (Two-Step)
```typescript
// Step 1: Start generation
const step1 = await flipAgent({
  request: "Generate a video of a dragon flying over mountains",
  videoPrompt: "A majestic dragon soaring over snow-capped mountains at sunset",
  aspectRatio: "9:16",
  resolution: "720p"
});
// Returns: { success: true, message: "...", data: { jobId: "veo_abc123", status: "pending" } }

// Step 2: Check and complete (call periodically until done)
const step2 = await flipAgent({
  request: "Check my video generation and create a flip when ready",
  jobId: "veo_abc123",
  feedIds: ["feed_family_abc"]
});

// Agent will:
// 1. Call checkVideoGeneration to poll status
// 2. If completed: Call uploadGeneratedVideo to save to Storage
// 3. Call moderateVideo, generateVideoSummary, generateVideoTitle
// 4. Call createFlip to publish
```

### Example 3: Browse Feed Content
```typescript
const result = await flipAgent({
  request: "Show me the latest flips in my family feed",
  feedIds: ["feed_family_abc"]
});

// Agent will:
// 1. Call getFeedFlips with the feedId
// Returns: { success: true, data: { flips: [...] } }
```

### Example 4: User Profile Management
```typescript
const result = await flipAgent({
  request: "Update my profile bio to 'Video creator and dragon enthusiast'",
});

// Agent will:
// 1. Call updateUserProfile with the new bio
```

### Example 5: Complete Video Generation Workflow
```typescript
const result = await flipAgent({
  request: "Generate a 9:16 vertical video of a sunset over the ocean, then create a flip and share to my friends feed",
  videoPrompt: "Beautiful sunset over calm ocean waves, warm colors, cinematic",
  feedIds: ["feed_friends_xyz"],
  aspectRatio: "9:16",
  resolution: "720p"
});

// First call returns job started:
// { success: true, message: "Video generation started...", data: { jobId: "veo_xyz" } }

// Subsequent calls with jobId will check status and complete when ready
```

## Input Schema

```typescript
{
  request: string;              // REQUIRED: Natural language request
  videoStoragePath?: string;    // Optional: Path to existing video
  videoPrompt?: string;         // Optional: AI generation prompt
  feedIds?: string[];           // Optional: Feed IDs
  jobId?: string;               // Optional: Video generation job ID
  title?: string;               // Optional: Custom title
  aspectRatio?: string;         // Optional: Video aspect ratio
  resolution?: string;          // Optional: Video resolution
}
```

## Output Schema

```typescript
{
  success: boolean;    // Operation success status
  message: string;     // Human-readable message
  data?: any;          // Result data (flip, job, flips list, etc.)
}
```

## Common Workflows

### Workflow 1: Existing Video → Flip
1. User provides `videoStoragePath` and `feedIds`
2. Agent moderates → summarizes → titles → creates flip
3. Returns flip ID and details

### Workflow 2: AI Generation → Flip (Multi-Call)
1. **Call 1**: User provides `videoPrompt` → Agent starts generation → Returns `jobId`
2. **Call 2+**: User provides `jobId` → Agent polls status → When complete: uploads → moderates → creates flip

### Workflow 3: Browse Content
1. User provides `feedIds` or natural request
2. Agent calls `getFeedFlips`
3. Returns list of flips

### Workflow 4: User/Feed Management
1. User makes natural language request
2. Agent routes to appropriate user or feed tool
3. Returns operation result

## Implementation Details

### File Structure
- **Agent Definition**: `functions/src/flows/flipFlows.ts`
- **Registration**: `functions/src/genkit.ts`
- **Export**: `functions/src/index.ts`
- **Cloud Function**: `flipAgent` (deployed as Firebase Function)

### Model Used
- **Primary**: `gemini-2.5-flash` (intelligent routing and orchestration)
- **Video Generation**: `veo-3.1-generate-preview` (via `generateVerticalVideo` tool)

### Security
- All operations require authentication (`context.auth.uid`)
- Tools enforce ownership checks (users can only access their own data)
- Video moderation required before flip creation

### Error Handling
- Agent wraps all operations in try-catch
- Returns `{ success: false, message: error.message }` on failure
- Detailed logging for debugging

## Migration Guide

### Before (3 Agents)
```typescript
// Had to know which agent to call
await flipCreationAgent({ feedIds, videoStoragePath });
await flipBrowserAgent({ feedId });
await videoGenerationAgent({ prompt, feedIds });
```

### After (1 Agent)
```typescript
// Natural language, one agent
await flipAgent({ request: "Create a flip from my video", videoStoragePath, feedIds });
await flipAgent({ request: "Show me flips in my family feed", feedIds });
await flipAgent({ request: "Generate a dragon video", videoPrompt });
```

## Testing

Run the agent in Genkit Developer UI:
```bash
pnpm genkit:dev
```

Then test various requests in the UI to see intelligent tool routing in action.

## Future Enhancements
- Background processor for automatic video generation polling
- Batch operations (create multiple flips at once)
- Advanced search/filter for feed browsing
- Video editing tools (trim, filters, etc.)
