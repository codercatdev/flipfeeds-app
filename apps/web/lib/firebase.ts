import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, type Functions, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0',
  authDomain: 'flipfeeds-app.firebaseapp.com',
  databaseURL: 'https://flipfeeds-app-default-rtdb.firebaseio.com',
  projectId: 'flipfeeds-app',
  storageBucket: 'flipfeeds-app.firebasestorage.app',
  messagingSenderId: '361402949529',
  appId: '1:361402949559:web:a197cc4ada3a64aaef3d08',
};

// Use emulators only in development mode
export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

// Initialize Firebase (client-side only)
let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

if (isClient) {
  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  // Connect to emulators in development
  if (USE_EMULATORS) {
    const host = 'localhost';

    try {
      connectAuthEmulator(authInstance, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectFunctionsEmulator(functions, host, 5001);

      console.log('✅ Firebase Emulators Connected');
      console.log(`   Auth: http://${host}:9099`);
      console.log(`   Functions: http://${host}:5001`);
      console.log(`   Firestore: http://${host}:8080`);
      console.log(`   Emulator UI: http://localhost:4000`);
    } catch (error) {
      console.warn('⚠️  Emulator connection error (may already be connected):', error);
    }
  } else {
    console.log('🌐 Using production Firebase');
  }

  // Enable persistence so auth state survives page reloads and redirects
  void setPersistence(authInstance, browserLocalPersistence).catch((err) => {
    console.error('Failed to set persistence:', err);
  });
}

// Export with type assertions for client-side usage
// Client components should only use these on the client side
export { app, db, functions };

// Export auth with proper typing - asserts it's defined on client
const clientAuth = authInstance as Auth;
export { clientAuth as auth };

// Safe auth getter for client components with better error handling
export const getClientAuth = (): Auth => {
  if (!authInstance) {
    throw new Error('Firebase Auth is only available on the client side');
  }
  return authInstance;
};
