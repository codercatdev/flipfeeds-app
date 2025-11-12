import { googleAI } from '@genkit-ai/googleai';
import type { CallableOptions } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { genkit } from 'genkit';

const googleAIapiKey = defineSecret('GEMINI_API_KEY');
export const genKitGoogleAiOptions: CallableOptions = {
    secrets: [googleAIapiKey],
    enforceAppCheck: false,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: false,
    // authPolicy: (auth) => auth?.token?.email_verified || false,
};

// Initialize Genkit with Google AI plugin
// Note: For local development, the API key can be set via environment variable
// The secret value is only accessible at runtime, not during deployment
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY,
        }),
    ],
    model: 'googleai/gemini-2.0-flash-exp',
});

// Phase 1.2 - Core Genkit Flows
// Import all flows to register them with Genkit
import './flows/userFlows';
import './flows/feedFlows';
import './flows/flipFlows';
import './flows/flipLinkFlows';
import './flows/inviteFlows';
