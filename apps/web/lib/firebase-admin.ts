import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (singleton pattern)
function getFirebaseAdmin() {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // In emulator mode, use demo project
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000';

    return initializeApp({
      projectId: 'flipfeeds-app',
    });
  }

  // Production mode - require service account
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required for Firebase Admin SDK'
    );
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

// Initialize the admin app
const adminApp = getFirebaseAdmin();
const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth };
