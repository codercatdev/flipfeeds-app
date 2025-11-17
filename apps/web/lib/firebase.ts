import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0',
  authDomain: 'flipfeeds-app.firebaseapp.com',
  databaseURL: 'https://flipfeeds-app-default-rtdb.firebaseio.com',
  projectId: 'flipfeeds-app',
  storageBucket: 'flipfeeds-app.firebasestorage.app',
  messagingSenderId: '361402949529',
  appId: '1:361402949529:web:a197cc4ada3a64aaef3d08',
};

// Use emulators only in development mode
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const database = getDatabase(app);

// Connect to emulators in development
if (USE_EMULATORS) {
  const host = 'localhost';

  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
    connectDatabaseEmulator(database, host, 9000);

    console.log('✅ Firebase Emulators Connected');
    console.log(`   Auth: http://${host}:9099`);
    console.log(`   Functions: http://${host}:5001`);
    console.log(`   Firestore: http://${host}:8080`);
    console.log(`   Database: http://${host}:9000`);
    console.log(`   Emulator UI: http://localhost:4000`);
  } catch (error) {
    console.warn('⚠️  Emulator connection error (may already be connected):', error);
  }
} else {
  console.log('🌐 Using production Firebase');
}

// Enable persistence so auth state survives page reloads and redirects
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to set persistence:', err);
});

export { app, auth, db, functions, database, USE_EMULATORS };
