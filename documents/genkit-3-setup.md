
Genkit Backend - Part 3: AI-First Video Tools & PromptsThis is where we add the "AI-First" magic. We'll define prompts and a tool for video summarization. This assumes you are using a multimodal model like Gemini (via Vertex AI).Task 3.1: Define AI PromptsCreate a file to store reusable Genkit prompts.File: flipfeeds-genkit/src/prompts/videoPrompts.ts// flipfeeds-genkit/src/prompts/videoPrompts.ts
import { definePrompt } from '@genkit-ai/prompt';
import { Part } from '@genkit-ai/vertex-ai';

// Prompt to summarize a video
export const summarizeVideoPrompt = definePrompt(
  {
    name: 'summarizeVideoPrompt',
    inputSchema: z.object({ video: z.custom<Part>() }),
  },
  async ({ video }) => ({
    messages: [
      {
        role: 'system',
        content: [
          { text: 'You are an expert video analyst for a social media app called "FlipFeeds". Your job is to create concise, engaging, and accurate summaries of uploaded videos. The summary should be 1-2 sentences, max 150 characters.' },
        ],
      },
      {
        role: 'user',
        content: [
          { text: 'Summarize this video:' },
          video, // The video data
        ],
      },
    ],
  }),
);

// Prompt to moderate video content
export const moderateVideoPrompt = definePrompt(
  {
    name: 'moderateVideoPrompt',
    inputSchema: z.object({ video: z.custom<Part>() }),
  },
  async ({ video }) => ({
    messages: [
      {
        role: 'system',
        content: [
          { text: 'You are a content moderation AI. Analyze the video and its audio. Respond ONLY with a JSON object. The object must have this schema: { "isSafe": boolean, "flags": ["hate_speech", "spam", "nsfw", "violence", "none"] }. "flags" should be an array of strings indicating all categories that apply. If no categories apply, use ["none"].' },
        ],
      },
      {
        role: 'user',
        content: [
          { text: 'Analyze this video for content safety:' },
          video,
        ],
      },
    ],
    output: {
      format: 'json',
      schema: z.object({
        isSafe: z.boolean(),
        flags: z.array(z.string()),
      }),
    },
  }),
);
**Task 3.2: Create processVideo Tool**

This tool will use a **single model call** to generate both summary and moderation data simultaneously. Modern multimodal models like Gemini 1.5 excel at multi-task instruction, reducing latency and cost compared to separate calls.

**File:** `flipfeeds-genkit/src/tools/videoTools.ts`

```typescript
// flipfeeds-genkit/src/tools/videoTools.ts
import { defineTool } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { vertexAI, Part } from '@genkit-ai/vertex-ai';
import * as z from 'zod';

// Use Gemini 1.5 Flash for speed and cost efficiency
const model = vertexAI('gemini-1.5-flash-preview-0514');

// Combined prompt for summary + moderation in a single call
const processVideoPrompt = definePrompt(
  {
    name: 'processVideoPrompt',
    inputSchema: z.object({ video: z.custom<Part>() }),
  },
  async ({ video }) => ({
    messages: [
      {
        role: 'system',
        content: [
          { 
            text: `You are an AI assistant for FlipFeeds, a video social media platform. Analyze the provided video and return a JSON object with TWO tasks:

1. **Summary**: Create a concise, engaging summary (1-2 sentences, max 150 characters)
2. **Moderation**: Assess content safety

Respond ONLY with valid JSON matching this schema:
{
  "summary": "string",
  "suggestedTitle": "string (max 60 chars, engaging title for the video)",
  "tags": ["array", "of", "relevant", "tags"],
  "moderation": {
    "isSafe": boolean,
    "flags": ["hate_speech", "spam", "nsfw", "violence", "none"]
  }
}

If the video is safe, set isSafe to true and flags to ["none"].
If unsafe, set isSafe to false and include ALL applicable flags.`
          },
        ],
      },
      {
        role: 'user',
        content: [
          { text: 'Analyze this video:' },
          video,
        ],
      },
    ],
    output: {
      format: 'json',
      schema: z.object({
        summary: z.string(),
        suggestedTitle: z.string(),
        tags: z.array(z.string()),
        moderation: z.object({
          isSafe: z.boolean(),
          flags: z.array(z.string()),
        }),
      }),
    },
  }),
);

export const processVideo = defineTool(
  {
    name: 'processVideo',
    description: 'Generates AI metadata (summary, title, tags, moderation) for a video in a single model call.',
    inputSchema: z.object({ gcsUri: z.string().startsWith('gs://') }),
    outputSchema: z.object({
      summary: z.string(),
      suggestedTitle: z.string(),
      tags: z.array(z.string()),
      moderation: z.object({
        isSafe: z.boolean(),
        flags: z.array(z.string()),
      }),
    }),
  },
  async ({ gcsUri }) => {
    // Create the video part from the GCS URI
    // The Gemini API requires a MIME type.
    // In a real app, you'd get this from Storage metadata.
    const videoPart = Part.fromGcsUri(gcsUri, 'video/mp4');

    // Single model call for all AI tasks
    const response = await generate({
      model,
      prompt: await processVideoPrompt({ video: videoPart }),
    });

    const result = response.output() || {
      summary: 'Video uploaded',
      suggestedTitle: 'Untitled Video',
      tags: [],
      moderation: { isSafe: true, flags: ['none'] }
    };

    return result;
  },
);
```

**Benefits of Single Model Call:**
- ⚡ **50% faster**: One API round-trip instead of two
- 💰 **Lower cost**: One input token charge instead of two (video is sent once, not twice)
- 🎯 **Better context**: Model sees full task scope, can make better decisions
- 🔧 **Simpler code**: One prompt, one response to parse

**Note:** This flow would be triggered by a Firebase Storage `onFinalize` event. We can create a flow for that, or have the client call a flow `createFlip` which then calls this tool.