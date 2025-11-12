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
import type { CallableOptions } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { genkit } from 'genkit';

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
 */
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY,
        }),
    ],
    model: 'googleai/gemini-2.5-flash',
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

// User management tools
import './tools/userTools';

// Feed management tools
import './tools/feedTools';

// Flip (video) management tools
import './tools/flipTools';

// Video processing tools
import './tools/videoTools';
