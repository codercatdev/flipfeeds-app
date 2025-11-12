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

// Import and re-export the Genkit instance and all flows from genkit.ts
// This ensures the CLI sees the same configuration as production
// Note: Firebase Admin is initialized in genkit.ts
export * from './genkit';

console.log('✅ Genkit development server initialized');
console.log('📊 All flows registered from genkit.ts');
console.log('🔧 All tools registered and available in Dev UI');
console.log('🌐 Open http://localhost:4001 to access Genkit Dev UI');
