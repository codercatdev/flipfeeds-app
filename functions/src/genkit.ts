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
}

const googleAIapiKey = defineSecret('GEMINI_API_KEY');
export const genKitGoogleAiOptions: CallableOptions = {
    secrets: [googleAIapiKey],
    enforceAppCheck: false,
    consumeAppCheckToken: false,
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
 * - googleai/gemini-1.5-flash (stable, fast)
 * - googleai/gemini-1.5-pro (stable, powerful)
 * - googleai/gemini-2.0-flash-exp (experimental)
 * - vertexai/imagen-3.0-fast-generate-001 (image generation)
 */
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY,
        }),
        vertexAI({
            projectId:
                process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'flipfeeds-app',
            location: 'us-central1',
        }),
    ],
    model: 'googleai/gemini-1.5-flash',
});

// Export vertexAI for use in flows
export { vertexAI };

// ============================================================================
// FLOW REGISTRATION (Import to Register)
// ============================================================================

/**
 * Import all flows to register them with Genkit.
 * This is the ONLY place flows should be imported.
 *
 * When you import a flow file that calls ai.defineFlow(),
 * Genkit automatically registers it in the global registry.
 */

// User management flows
import { registerUserFlows } from './flows/userFlows';
const { conversationalProfileFlowAction } = registerUserFlows(ai);
export const conversationalProfileFlow = onCallGenkit(
    genKitGoogleAiOptions,
    conversationalProfileFlowAction
);

// Feed management flows
import { createFeedFlow as createFeedFlowDef } from './flows/feedFlows';
export const createFeedFlow = onCallGenkit(genKitGoogleAiOptions, createFeedFlowDef);

// Flip (video) management flows
import { createFlipFlow as createFlipFlowDef } from './flows/flipFlows';
export const createFlipFlow = onCallGenkit(genKitGoogleAiOptions, createFlipFlowDef);

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * Import and register all tool registration functions
 */
import { registerUserTools } from './tools/userTools';

// Register user management tools
registerUserTools(ai);

/**
 * Export user tools schema for reference
 * (actual tools are registered dynamically with Genkit)
 */
export { UserProfileSchema } from './tools/userTools';
