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
import type { CallableOptions } from 'firebase-functions/https';
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
 * In dev/emulator: Set FIRESTORE_EMULATOR_HOST and GCLOUD_PROJECT env vars
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

// Feed management flows
// TODO: Uncomment when feedFlows.ts is created
// import { registerFeedFlows } from './flows/feedFlows';

// Flip (video) management flows
// TODO: Uncomment when flipFlows.ts is created
// import { registerFlipFlows } from './flows/flipFlows';

// Flip link flows
// TODO: Uncomment when flipLinkFlows.ts is created
// import { registerFlipLinkFlows } from './flows/flipLinkFlows';

// Invitation flows
// TODO: Uncomment when inviteFlows.ts is created
// import { registerInviteFlows } from './flows/inviteFlows';

// ============================================================================
// FLOW AND TOOL REGISTRATION
// ============================================================================

/**
 * Register all flows and tools with Genkit after initialization.
 * They are registered via functions to avoid circular dependencies.
 * This must happen AFTER Genkit is initialized but BEFORE export.
 */

// Register user management flows
registerUserFlows(ai);

// Register feed management flows
// TODO: Uncomment when registerFeedFlows is created
// registerFeedFlows(ai);

// Register flip management flows
// TODO: Uncomment when registerFlipFlows is created
// registerFlipFlows(ai);

// Register flip link flows
// TODO: Uncomment when registerFlipLinkFlows is created
// registerFlipLinkFlows(ai);

// Register invitation flows
// TODO: Uncomment when registerInviteFlows is created
// registerInviteFlows(ai);

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

/**
 * Import and register all tool registration functions
 */
import { registerUserTools } from './tools/userTools';

// Register user management tools
registerUserTools(ai);

// Feed management tools
// TODO: Uncomment when feedTools.ts is created
// import { registerFeedTools } from './tools/feedTools';
// registerFeedTools(ai);

// Flip (video) management tools
// TODO: Uncomment when flipTools.ts is created
// import { registerFlipTools } from './tools/flipTools';
// registerFlipTools(ai);

// Video processing tools
// TODO: Uncomment when videoTools.ts is created
// import { registerVideoTools } from './tools/videoTools';
// registerVideoTools(ai);

/**
 * Export user tools schema for reference
 * (actual tools are registered dynamically with Genkit)
 */
export { UserProfileSchema } from './tools/userTools';
