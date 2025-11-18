# Video Generation Tools - Veo 3.1 Integration

## Overview
Three-step workflow for generating videos using Google Veo 3.1, following the Genkit operation pattern with rate-limited polling.

## Tools

### 1. `generateVerticalVideo`
**Purpose:** Start a video generation job using Veo 3.1

**Input:**
```typescript
{
  prompt: string;          // Detailed description of the video
  aspectRatio?: string;    // Default: '9:16' (vertical/mobile)
  resolution?: string;     // Default: '720p'
}
```

**Output:**
```typescript
{
  jobId: string;           // Unique job ID for tracking
  operationName: string;   // Google AI operation name
  status: 'processing';
}
```

**Example:**
```typescript
const job = await generateVerticalVideo({
  prompt: "A majestic dragon soaring over a mystical forest at dawn, cinematic lighting",
  aspectRatio: "9:16",
  resolution: "720p"
});
// Returns: { jobId: "veo_1234567890_xyz", operationName: "operations/...", status: "processing" }
```

---

### 2. `checkVideoGeneration`
**Purpose:** Check the status of a video generation operation

**Features:**
- ✅ Built-in rate limiting (5 second minimum between checks)
- ✅ Polls Google AI operation using Genkit's `checkOperation()`
- ✅ Automatically updates Firestore with latest status
- ✅ Returns temp Google AI URL when complete

**Input:**
```typescript
{
  jobId: string;  // Job ID from generateVerticalVideo
}
```

**Output:**
```typescript
{
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  operationName?: string;
  videoUrl?: string;           // Temp Google AI URL (expires!)
  lastCheckedAt?: string;
  error?: string;
  // ... other job fields
}
```

**Example:**
```typescript
// First check (will poll operation)
const status1 = await checkVideoGeneration({ jobId: "veo_1234567890_xyz" });
// Returns: { status: "processing", lastCheckedAt: "2025-11-17T10:00:00Z", ... }

// Immediate second check (rate limited, returns cached status)
const status2 = await checkVideoGeneration({ jobId: "veo_1234567890_xyz" });
// Returns same data without polling (< 5 seconds elapsed)

// After 5+ seconds (will poll again)
const status3 = await checkVideoGeneration({ jobId: "veo_1234567890_xyz" });
// Returns: { status: "completed", videoUrl: "https://...", ... }
```

---

### 3. `uploadGeneratedVideo`
**Purpose:** Upload completed video to Firebase Storage

**Features:**
- ✅ Downloads from temporary Google AI URL (adds API key)
- ✅ Uploads to permanent Firebase Storage
- ✅ Makes file public
- ✅ Updates job with storage path and public URL
- ✅ Idempotent (returns existing upload if already done)

**Input:**
```typescript
{
  jobId: string;  // Job ID of completed generation
}
```

**Output:**
```typescript
{
  storagePath: string;  // e.g., "generated-videos/uid123/1234567890_abc.mp4"
  publicUrl: string;    // Public Firebase Storage URL
  flipReady: true;      // Ready to create a Flip
}
```

**Example:**
```typescript
const upload = await uploadGeneratedVideo({ jobId: "veo_1234567890_xyz" });
// Returns: {
//   storagePath: "generated-videos/uid123/1234567890_abc.mp4",
//   publicUrl: "https://storage.googleapis.com/bucket/generated-videos/...",
//   flipReady: true
// }
```

---

## Complete Workflow

### Using flipCreationAgent (Recommended)
```typescript
// Step 1: Start generation (returns immediately)
const result = await flipCreationAgent({
  videoPrompt: "A majestic dragon soaring over a mystical forest at dawn",
  feedIds: ["feed_family", "feed_friends"],
  aspectRatio: "9:16"
});

if (result.type === 'video_generation_started') {
  console.log("Job started:", result.jobId);
  console.log("Operation:", result.operationName);
  
  // Step 2: Agent polls until complete
  let status;
  do {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    status = await checkVideoGeneration({ jobId: result.jobId });
  } while (status.status === 'processing');
  
  if (status.status === 'completed') {
    // Step 3: Upload to permanent storage
    const upload = await uploadGeneratedVideo({ jobId: result.jobId });
    console.log("Video uploaded:", upload.storagePath);
    
    // Step 4: Create the flip with the uploaded video
    const flip = await flipCreationAgent({
      videoStoragePath: upload.storagePath, // ✅ Use storagePath from upload
      feedIds: ["feed_family", "feed_friends"],
      title: "My Generated Dragon Video" // Optional, will be auto-generated if omitted
    });
    
    console.log("Flip created:", flip.flipId);
  }
}
```

### Manual Workflow
```typescript
// Step 1: Start generation
const job = await generateVerticalVideo({
  prompt: "A majestic dragon...",
  aspectRatio: "9:16"
});
console.log("Started:", job.jobId);

// Step 2: Poll until complete (respects rate limiting)
let status;
do {
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
  status = await checkVideoGeneration({ jobId: job.jobId });
  console.log("Status:", status.status);
} while (status.status === 'processing');

// Step 3: Upload to Storage
if (status.status === 'completed') {
  const upload = await uploadGeneratedVideo({ jobId: job.jobId });
  console.log("Video uploaded to:", upload.storagePath);
  console.log("Public URL:", upload.publicUrl);
  
  // Step 4: Create Flip with the storage path
  const flip = await createFlip({
    videoStoragePath: upload.storagePath, // ✅ This is what createFlip needs
    feedIds: ["feed_family"],
    title: "My Generated Video",
    summary: "A stunning dragon video created with AI"
  });
  
  console.log("Flip created successfully:", flip.flipId);
}
```

---

## Rate Limiting

`checkVideoGeneration` enforces a **5-second minimum** between actual operation polls:

- ✅ **First call:** Always polls the operation
- ⏸️ **Subsequent calls < 5s:** Returns cached Firestore data
- ✅ **Calls after 5s:** Polls the operation again

This prevents excessive API calls and respects Google AI quotas.

---

## Firestore Schema

**Collection:** `videoGenerationJobs`

**Document:** `{jobId}`
```typescript
{
  jobId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  operationName?: string;      // Google AI operation name
  lastCheckedAt?: string;      // For rate limiting
  videoUrl?: string;           // Temp Google AI URL
  storagePath?: string;        // Firebase Storage path
  publicUrl?: string;          // Public Firebase URL
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

## Security Rules

```javascript
// users can read/delete their own jobs
// create/update only via backend (Admin SDK)
match /videoGenerationJobs/{jobId} {
  allow read, delete: if request.auth != null && 
                          resource.data.userId == request.auth.uid;
  allow create, update: if false; // Backend only
}
```

---

## Data Flow: Generation to Flip Creation

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. generateVerticalVideo                                        │
│    Input:  { prompt, aspectRatio, resolution }                  │
│    Output: { jobId, operationName, status: "processing" }       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. checkVideoGeneration (poll until complete)                   │
│    Input:  { jobId }                                            │
│    Output: { status, videoUrl, ... }                            │
│                                                                  │
│    When status="completed":                                     │
│    - videoUrl: "https://generativelanguage.../temp" (EXPIRES!)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. uploadGeneratedVideo                                         │
│    Input:  { jobId }                                            │
│    Output: {                                                    │
│              storagePath: "generated-videos/uid/xyz.mp4", ✅   │
│              publicUrl: "https://storage.googleapis.com/...",   │
│              flipReady: true                                    │
│            }                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. createFlip (or flipCreationAgent)                            │
│    Input:  {                                                    │
│              videoStoragePath: "generated-videos/uid/xyz.mp4",✅│
│              feedIds: ["feed_123"],                             │
│              title: "...",                                      │
│              summary: "..."                                     │
│            }                                                     │
│    Output: { flipId }                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- ✅ `uploadGeneratedVideo.storagePath` → `createFlip.videoStoragePath` (COMPATIBLE!)
- ⚠️ Don't use `checkVideoGeneration.videoUrl` for flips (it's a temp Google AI URL)
- ✅ Always call `uploadGeneratedVideo` before creating a flip
- ✅ The `storagePath` format matches what flip storage expects

---

## Environment Variables Required

```bash
# Required for downloading generated videos
GEMINI_API_KEY=your_gemini_api_key
# OR
GOOGLE_GENAI_API_KEY=your_api_key
```

---

## Implementation Details

### Genkit Operation Handling
```typescript
// generate() returns an operation
const { operation } = await ai.generate({
  model: 'googleai/veo-3.1-generate-preview',
  prompt: "...",
  config: { aspectRatio: '9:16', resolution: '720p' }
});

// Access operation name (type assertion required)
const operationName = (operation as any).name as string;

// Later, check operation status
const operation = await ai.checkOperation(operationName as any);

// Check if done
const isDone = (operation as any).done;

// Extract video from output
const output = (operation as any).output || {};
const message = output.message || {};
const content = message.content || [];
const video = content.find((p: any) => p.media);
const videoUrl = video?.media?.url;
```

### Download with API Key
```typescript
// Google AI URLs require API key parameter
const downloadUrl = `${videoUrl}&key=${process.env.GEMINI_API_KEY}`;
const response = await fetch(downloadUrl);
const videoBuffer = Buffer.from(await response.arrayBuffer());
```

---

## Testing

```typescript
// Test the complete workflow
import { generateVerticalVideo, checkVideoGeneration, uploadGeneratedVideo } from './tools/videoGenerationTools';

// 1. Start
const job = await generateVerticalVideo({
  prompt: "A serene lake at sunset, cinematic",
  aspectRatio: "9:16"
}, ai, { auth: { uid: "test-user-123" } });

console.log("Job:", job);

// 2. Check (will be processing)
const status = await checkVideoGeneration(
  { jobId: job.jobId },
  ai,
  { auth: { uid: "test-user-123" } }
);

console.log("Status:", status);

// 3. Upload (once completed)
// const upload = await uploadGeneratedVideo(
//   { jobId: job.jobId },
//   { auth: { uid: "test-user-123" } }
// );
```

---

## Error Handling

### Common Errors
1. **"Expected the model to return an operation"**
   - Veo model didn't return an operation object
   - Check model name and config

2. **"Video generation not completed yet. Status: processing"**
   - Called uploadGeneratedVideo before completion
   - Keep polling checkVideoGeneration

3. **"Failed to fetch video from Google AI"**
   - Temp URL expired or API key missing
   - Ensure GEMINI_API_KEY is set

4. **"Rate limit: Last checked X ms ago"**
   - Not an error! Tool is rate limiting
   - Wait 5 seconds before next check

---

## Next Steps

1. ✅ Video generation with Veo 3.1
2. ✅ Operation polling with rate limiting
3. ✅ Upload to Firebase Storage
4. 🔄 **TODO:** Background Cloud Function to auto-poll and upload
5. 🔄 **TODO:** Webhook support for operation completion
6. 🔄 **TODO:** Batch video generation
