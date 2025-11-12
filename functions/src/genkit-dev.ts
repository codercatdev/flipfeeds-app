/**
 * Genkit Development Entry Point
 *
 * This file is the entry point for the Genkit CLI Developer UI.
 * It sets up Firebase Admin for emulator use, then imports from genkit.ts
 * to avoid duplicating Genkit initialization and flow imports.
 *
 * Usage:
 *   pnpm genkit:dev
 *   genkit start -- npx tsx --watch src/genkit-dev.ts
 *
 * The genkit.ts file handles Genkit initialization and flow registration.
 */

import * as admin from 'firebase-admin';

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

// Import and re-export the Genkit instance and all flows from genkit.ts
// This ensures the CLI sees the same configuration as production
export * from './genkit';

console.log('✅ Genkit development server initialized');
console.log('📊 All flows registered from genkit.ts');
console.log('🔧 Utility functions available from tools/ (not Genkit AI tools)');
