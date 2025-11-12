
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
Task 3.2: Create processVideo ToolThis tool will use a model to generate the AI data. It takes a video file (e.g., from Firebase Storage) as input.File: flipfeeds-genkit/src/tools/videoTools.ts// flipfeeds-genkit/src/tools/videoTools.ts
import { defineTool } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { vertexAI, Part } from '@genkit-ai/vertex-ai'; // Assuming Vertex AI for multimodal
import { summarizeVideoPrompt, moderateVideoPrompt } from '../prompts/videoPrompts';
import * as z from 'zod';

// We'll use Gemini 1.5 Flash for speed and cost
const summaryModel = vertexAI('gemini-1.5-flash-preview-0514');
const moderationModel = vertexAI('gemini-1.5-flash-preview-0514');

export const processVideo = defineTool(
  {
    name: 'processVideo',
    description: 'Generates AI metadata (summary, moderation) for a video.',
    // Input will be a Google Cloud Storage path
    inputSchema: z.object({ gcsUri: z.string().startsWith('gs://') }),
    outputSchema: z.object({
      summary: z.string(),
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

    // 1. Generate Summary
    const summaryResponse = await generate({
      model: summaryModel,
      prompt: await summarizeVideoPrompt({ video: videoPart }),
    });
    const summary = summaryResponse.text();

    // 2. Generate Moderation
    const moderationResponse = await generate({
      model: moderationModel,
      prompt: await moderateVideoPrompt({ video: videoPart }),
    });
    const moderationData = moderationResponse.output() || { isSafe: true, flags: ['none'] };

    return {
      summary,
      moderation: moderationData,
    };
  },
);
Note: This flow would be triggered by a Firebase Storage onFinalize event. We can create a flow for that, or have the client call a flow createFlip which then calls this tool.