/**
 * Test setup for Firebase Functions tests
 *
 * This file sets up the environment for testing with Firebase emulators
 */

const admin = require('firebase-admin');
const fs = require('node:fs');
const path = require('node:path');

// Set environment variables for emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
process.env.GCLOUD_PROJECT = 'demo-flipfeeds-test';
process.env.FIREBASE_PROJECT = 'demo-flipfeeds-test';
process.env.STORAGE_BUCKET = 'demo-flipfeeds-test.firebasestorage.app';

// Load API keys from .secret.local if it exists and env vars are not set
if (!process.env.GEMINI_API_KEY) {
  try {
    const secretPath = path.join(__dirname, '..', '.secret.local');
    if (fs.existsSync(secretPath)) {
      const secretContent = fs.readFileSync(secretPath, 'utf8');
      const geminiMatch = secretContent.match(/GEMINI_API_KEY="([^"]+)"/);
      if (geminiMatch) {
        process.env.GEMINI_API_KEY = geminiMatch[1];
        console.log('✅ Loaded GEMINI_API_KEY from .secret.local');
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read .secret.local:', error.message);
  }
}

// Final check for API key
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Image generation tests will fail.');
  console.warn('   Set it with: export GEMINI_API_KEY=your-key');
  console.warn('   Or add it to functions/.secret.local');
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT,
    storageBucket: process.env.STORAGE_BUCKET,
  });
  console.log('✅ Firebase Admin initialized for testing');
  console.log('🔧 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
  console.log('🔧 Using Auth Emulator:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

// Add chai for assertions
global.expect = require('chai').expect;
