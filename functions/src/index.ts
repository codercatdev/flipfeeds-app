import * as admin from 'firebase-admin';
import { sendFlip } from './sendFlip';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { sendFlip };
