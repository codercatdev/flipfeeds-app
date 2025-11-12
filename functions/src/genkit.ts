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

    if (projectId) {
        admin.initializeApp({ projectId });
    } else {
        admin.initializeApp();
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
 * Initialize Genkit with Google AI plugin
 *
 * For local development, set GEMINI_API_KEY in .env
 * For production, use Firebase secrets
 *
 * Available models:
 * - googleai/gemini-1.5-flash (stable, fast)
 * - googleai/gemini-1.5-pro (stable, powerful)
 * - googleai/gemini-2.0-flash-exp (experimental)
 */
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY,
        }),
    ],
    model: 'googleai/gemini-1.5-flash',
});

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
import './flows/userFlows';

// Feed management flows
import './flows/feedFlows';

// Flip (video) management flows
import './flows/flipFlows';

// Flip link flows
import './flows/flipLinkFlows';

// Invitation flows
import './flows/inviteFlows';

// ============================================================================
// TOOL REGISTRATION (Import to Register)
// ============================================================================

/**
 * Import all tools to register them with Genkit.
 * Tools defined with ai.defineTool() are automatically registered.
 * These tools can be used by flows or directly called in the Dev UI.
 */

// Feed management tools
import * as feedTools from './tools/feedTools';
// Flip (video) management tools
import * as flipTools from './tools/flipTools';
// User management tools
import * as userTools from './tools/userTools';

// Video processing tools
import * as videoTools from './tools/videoTools';

// Export all tools so they're accessible
export { userTools, feedTools, flipTools, videoTools };
