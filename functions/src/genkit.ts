/**
 * Genkit Initialization - Single Source of Truth
 *
 * This is the ONLY place where Genkit is initialized and flows are imported.
 *
 * Architecture:
 * - genkit-dev.ts re-exports from here (for CLI testing)
 * - index.ts imports this (to register flows in production)
 * - mcpServer.ts accesses flows via ai.registry.listActions()
 *
 * To add a new flow:
 * 1. Create the flow in src/flows/
 * 2. Import it below
 * 3. It's automatically available in CLI and MCP
 *
 * See GENKIT_ARCHITECTURE.md for details.
 */

import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';
import * as admin from 'firebase-admin';
import { type CallableOptions, onCallGenkit } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { genkit } from 'genkit';

// ============================================================================
// FIREBASE ADMIN INITIALIZATION
// ============================================================================

/**
 * Initialize Firebase Admin SDK
 * This must happen BEFORE importing flows/tools that use Firestore
 *
 * In production: Uses default credentials
 * In dev/emulator: Set FIRESTORE_EMulator_HOST and GCLOUD_PROJECT env vars
 */
if (!admin.apps.length) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT;
  const storageBucket = process.env.STORAGE_BUCKET || 'flipfeeds-app.firebasestorage.app';

  if (projectId) {
    admin.initializeApp({
      projectId,
      storageBucket,
    });
  } else {
    admin.initializeApp({
      storageBucket,
    });
  }

  // Log emulator configuration for debugging
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('🔧 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log('🔧 Using Auth Emulator:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
  }
}

const googleAIapiKey = defineSecret('GEMINI_API_KEY');
export const genKitGoogleAiOptions: CallableOptions = {
  cors: ['https://flipfeeds.com', 'https://www.flipfeeds.com'],
  secrets: [googleAIapiKey],
  enforceAppCheck: false,
  consumeAppCheckToken: false,
  timeoutSeconds: 540,
  memory: '512MiB',
  cpu: 1,
  minInstances: 0,
};

// ============================================================================
// GENKIT INITIALIZATION (Single Source of Truth)
// ============================================================================

/**
 * Initialize Genkit with Google AI and Vertex AI plugins
 *
 * For local development, set GEMINI_API_KEY in .env
 * For production, use Firebase secrets
 *
 * Available models:
 * - googleai/gemini-2.5-flash (stable, fast - default)
 * - googleai/gemini-2.5-flash-lite (stable, ultra-fast & cost-efficient)
 * - googleai/gemini-2.5-pro (stable, powerful reasoning)
 * - vertexai/imagen-3.0-fast-generate-001 (image generation)
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    vertexAI({
      projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'flipfeeds-app',
      location: 'us-central1',
    }),
  ],
  model: 'googleai/gemini-2.5-flash-lite',
});

// Export vertexAI for use in flows
export { vertexAI };

// ============================================================================
// AGENT REGISTRATION (Import to Register)
// ============================================================================

/**
 * Import all agents (formerly "flows") to register them with Genkit.
 * This is the ONLY place agents should be imported.
 *
 * When you import an agent file that calls ai.defineFlow(),
 * Genkit automatically registers it in the global registry.
 */

// User management agents
import { registerUserFlows } from './flows/userFlows';

const { onboardingAgentAction, profileAgentAction, imageAgentAction } = registerUserFlows(ai);

export const onboardingAgent = onCallGenkit(genKitGoogleAiOptions, onboardingAgentAction);
export const profileAgent = onCallGenkit(genKitGoogleAiOptions, profileAgentAction);
export const imageAgent = onCallGenkit(genKitGoogleAiOptions, imageAgentAction);

// Feed management agents
import { registerFeedFlows } from './flows/feedFlows';

const { feedCreationAgentAction, feedManagementAgentAction } = registerFeedFlows(ai);

export const feedCreationAgent = onCallGenkit(genKitGoogleAiOptions, feedCreationAgentAction);
export const feedManagementAgent = onCallGenkit(genKitGoogleAiOptions, feedManagementAgentAction);

// Flip (video) management agents
import { registerFlipFlows } from './flows/flipFlows';

const { flipAgentAction } = registerFlipFlows(ai);

export const flipAgent = onCallGenkit(genKitGoogleAiOptions, flipAgentAction);

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

import { registerFeedTools } from './tools/feedTools';
import { registerFlipTools } from './tools/flipTools';
/**
 * Import and register all tool registration functions
 */
import { registerUserTools } from './tools/userTools';
import { registerVideoGenerationTools } from './tools/videoGenerationTools';
import { registerVideoTools } from './tools/videoTools';

// Register user management tools
registerUserTools(ai);

// Register feed management tools
registerFeedTools(ai);

// Register flip management tools
registerFlipTools(ai);

// Register video processing tools
registerVideoTools(ai);

// Register video generation tools
registerVideoGenerationTools(ai);

export { FeedSchema } from './tools/feedTools';
export { FlipSchema } from './tools/flipTools';
/**
 * Export schemas for reference
 * (actual tools are registered dynamically with Genkit)
 */
export { UserProfileSchema } from './tools/userTools';
export { VideoGenerationJobSchema } from './tools/videoGenerationTools';
export { VideoModerationResultSchema } from './tools/videoTools';

// ============================================================================
// TOOL HELPER UTILITIES
// ============================================================================

/**
 * Get tool references from the Genkit registry by name.
 * This provides a consistent way to load tools across all flows.
 *
 * @param toolNames - Array of tool names to load
 * @returns Promise resolving to array of tool references (undefined entries filtered out)
 *
 * @example
 * const tools = await getTools(['getUserProfile', 'createFlip']);
 * const result = await ai.generate({ tools, prompt: '...' });
 */
export async function getTools(toolNames: string[]) {
  const toolPromises = toolNames.map((name) => ai.registry.lookupAction(`/tool/${name}`));
  const tools = (await Promise.all(toolPromises)).filter((tool) => tool !== undefined);
  return tools;
}
