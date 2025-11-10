import * as admin from 'firebase-admin';
import { generatePoem } from './genkit';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { generatePoem };