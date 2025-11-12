/**
 * Genkit Development Entry Point
 *
 * This file is specifically for testing flows and tools with the Genkit CLI.
 * It initializes Genkit with the same configuration as production but points
 * to Firebase Emulators for local development.
 *
 * Usage:
 *   pnpm genkit:dev
 */

import { googleAI } from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';
import { genkit } from 'genkit';

// Initialize Firebase Admin to point to emulators
// This allows the same tools to work with emulated Firestore
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT || 'demo-flipfeeds',
    });

    // Configure Firestore to use emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
        console.log('🔧 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
    } else {
        console.log('⚠️  FIRESTORE_EMULATOR_HOST not set. Run with emulators or set manually.');
    }
}

// Initialize Genkit with the same configuration as production
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GEMINI_API_KEY,
        }),
    ],
    model: 'googleai/gemini-2.5-flash',
});

// Import all flows to register them with Genkit
// These are the same flows used in production
import './flows/userFlows';
import './flows/feedFlows';
import './flows/flipFlows';
import './flows/flipLinkFlows';
import './flows/inviteFlows';

console.log('✅ Genkit development server initialized');
console.log('📊 All flows and tools registered');
