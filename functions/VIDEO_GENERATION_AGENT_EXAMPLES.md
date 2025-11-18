# Video Generation Agent Examples

The `videoGenerationAgent` is a complete, orchestrated workflow that handles everything from video generation to flip creation.

## Features

✅ **Two Modes:**
1. **Start New**: Provide a `prompt` to generate a new video
2. **Resume Existing**: Provide a `jobId` to continue from where you left off

✅ **Automatic Workflow:**
- Starts video generation (if prompt provided)
- Polls operation status
- Uploads to Firebase Storage when complete
- Creates flip with moderation, summary, and title

✅ **Stateless**: Call it multiple times with the same `jobId` to resume

---

## Usage Examples

### Example 1: Start New Video Generation

```typescript
// First call: Start generation
const result = await videoGenerationAgent({
  prompt: "A majestic dragon soaring over a mystical forest at dawn, cinematic lighting",
  feedIds: ["feed_family", "feed_friends"],
  aspectRatio: "9:16",
  resolution: "720p"
});

// Returns:
// {
//   status: "generation_started",
//   jobId: "veo_1234567890_abc",
//   operationName: "operations/...",
//   message: "Video generation started! Job ID: veo_1234567890_abc. Call this agent again with the jobId to continue."
// }
```

### Example 2: Check Status and Continue

```typescript
// Second call: Check status (use jobId from first call)
const result = await videoGenerationAgent({
  jobId: "veo_1234567890_abc",
  feedIds: ["feed_family", "feed_friends"]
});

// If still processing:
// {
//   status: "still_processing",
//   jobId: "veo_1234567890_abc",
//   message: "Video is still processing. Call this agent again with jobId: veo_1234567890_abc to continue."
// }

// If completed and flip created:
// {
//   status: "flip_created",
//   flipId: "flip_xyz",
//   jobId: "veo_1234567890_abc",
//   videoStoragePath: "generated-videos/uid123/xyz.mp4",
//   title: "Majestic Dragon Over Mystical Forest",
//   summary: "A stunning cinematic video of a dragon flying at dawn over an enchanted forest..."
// }
```

### Example 3: Complete Workflow with Polling

```typescript
// Start generation
let result = await videoGenerationAgent({
  prompt: "A serene mountain lake at sunset with reflections",
  feedIds: ["feed_photography"],
  title: "Sunset Serenity" // Optional: provide custom title
});

console.log("Started:", result.jobId);

// Poll until complete
while (result.status === 'generation_started' || result.status === 'still_processing') {
  // Wait 10 seconds before checking again
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  result = await videoGenerationAgent({
    jobId: result.jobId,
    feedIds: ["feed_photography"],
    title: "Sunset Serenity"
  });
  
  console.log("Status:", result.status);
}

if (result.status === 'flip_created') {
  console.log("Success! Flip created:", result.flipId);
  console.log("Title:", result.title);
  console.log("Summary:", result.summary);
} else if (result.status === 'failed') {
  console.error("Failed:", result.error);
}
```

### Example 4: Resume from Existing Job

```typescript
// If you already have a job ID (e.g., from a previous session),
// you can resume directly without knowing the prompt

const result = await videoGenerationAgent({
  jobId: "veo_1234567890_abc", // From previous session
  feedIds: ["feed_family"]
});

// Agent will check status and continue workflow automatically
```

---

## Input Schema

```typescript
{
  // Provide EITHER jobId (resume) OR prompt (start new)
  jobId?: string;           // Resume existing job
  prompt?: string;          // Start new generation
  
  // Required for all calls
  feedIds: string[];        // Feeds to share flip to
  
  // Optional
  title?: string;           // Custom title (auto-generated if omitted)
  aspectRatio?: string;     // Default: "9:16"
  resolution?: string;      // Default: "720p"
}
```

## Output Schema (Union Type)

### Status: `generation_started`
```typescript
{
  status: "generation_started",
  jobId: string,
  operationName: string,
  message: string
}
```

### Status: `still_processing`
```typescript
{
  status: "still_processing",
  jobId: string,
  message: string
}
```

### Status: `flip_created` ✅
```typescript
{
  status: "flip_created",
  flipId: string,
  jobId: string,
  videoStoragePath: string,
  title: string,
  summary: string
}
```

### Status: `failed` ❌
```typescript
{
  status: "failed",
  jobId?: string,
  error: string
}
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ videoGenerationAgent({ prompt, feedIds })                       │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 1. Validate input (jobId XOR prompt)                       │ │
│ └────────────────────────────────────────────────────────────┘ │
│                          │                                      │
│                          ▼                                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 2. Start generation (if prompt)                            │ │
│ │    → generateVerticalVideo                                 │ │
│ │    → Return: { status: "generation_started", jobId, ... }  │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
           User waits and calls again with jobId
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ videoGenerationAgent({ jobId, feedIds })                        │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 3. Check status                                            │ │
│ │    → checkVideoGeneration                                  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                          │                                      │
│         ┌────────────────┴────────────────┐                    │
│         ▼                                  ▼                    │
│  Still Processing?              Completed?                      │
│  Return: { status:              Continue ▼                      │
│    "still_processing" }                                         │
│                         ┌────────────────────────────────────┐ │
│                         │ 4. Upload to Storage               │ │
│                         │    → uploadGeneratedVideo          │ │
│                         └────────────────────────────────────┘ │
│                                          │                      │
│                                          ▼                      │
│                         ┌────────────────────────────────────┐ │
│                         │ 5. Create Flip                     │ │
│                         │    → moderateVideo                 │ │
│                         │    → generateVideoSummary          │ │
│                         │    → generateVideoTitle            │ │
│                         │    → createFlip                    │ │
│                         └────────────────────────────────────┘ │
│                                          │                      │
│                                          ▼                      │
│              Return: { status: "flip_created", flipId, ... }   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Manual vs Agent

### Manual Workflow (4 separate calls)
```typescript
// 1. Generate
const job = await generateVerticalVideo({ prompt: "..." });

// 2. Poll
let status = await checkVideoGeneration({ jobId: job.jobId });
while (status.status === 'processing') {
  await new Promise(r => setTimeout(r, 5000));
  status = await checkVideoGeneration({ jobId: job.jobId });
}

// 3. Upload
const upload = await uploadGeneratedVideo({ jobId: job.jobId });

// 4. Create flip
const flip = await flipCreationAgent({
  videoStoragePath: upload.storagePath,
  feedIds: ["feed_123"]
});
```

### Agent Workflow (2 calls)
```typescript
// 1. Start
let result = await videoGenerationAgent({
  prompt: "...",
  feedIds: ["feed_123"]
});

// 2. Complete (with auto-retry)
while (result.status !== 'flip_created' && result.status !== 'failed') {
  await new Promise(r => setTimeout(r, 10000));
  result = await videoGenerationAgent({
    jobId: result.jobId,
    feedIds: ["feed_123"]
  });
}
```

✅ **The agent handles all the orchestration automatically!**

---

## Error Handling

```typescript
const result = await videoGenerationAgent({
  prompt: "A video prompt",
  feedIds: ["feed_123"]
});

if (result.status === 'failed') {
  console.error("Error:", result.error);
  
  // Common errors:
  // - "Must provide either jobId or prompt"
  // - "Cannot provide both jobId and prompt"
  // - "Video generation failed"
  // - "Failed to upload video to storage"
  // - Moderation failures
  // - etc.
}
```

---

## Best Practices

1. **Save the jobId**: Store it in your database so users can resume later
2. **Polling interval**: Use 5-10 second intervals to respect rate limits
3. **Provide custom titles**: Better UX than auto-generated titles
4. **Handle failures gracefully**: Show meaningful error messages to users
5. **Use background jobs**: For production, consider Cloud Tasks for polling

---

## Integration Example (Cloud Function)

```typescript
import { videoGenerationAgent } from './genkit';

export const generateVideoFlip = onCall(async (request) => {
  const { prompt, feedIds, title } = request.data;
  
  // Start generation
  const result = await videoGenerationAgent({
    prompt,
    feedIds,
    title
  });
  
  // Return jobId to client for polling
  return {
    jobId: result.jobId,
    status: result.status,
    message: result.message
  };
});

export const checkVideoFlipStatus = onCall(async (request) => {
  const { jobId, feedIds } = request.data;
  
  // Check and continue workflow
  const result = await videoGenerationAgent({
    jobId,
    feedIds
  });
  
  return result;
});
```

---

## Summary

The `videoGenerationAgent` provides a **complete, stateless, resumable workflow** for AI video generation and flip creation. It's designed to be:

- ✅ **Easy to use**: Just provide prompt or jobId
- ✅ **Resilient**: Can be called multiple times with same jobId
- ✅ **Complete**: Handles everything from generation to flip
- ✅ **Type-safe**: Full TypeScript support with union types

Perfect for building user-facing video generation features!
