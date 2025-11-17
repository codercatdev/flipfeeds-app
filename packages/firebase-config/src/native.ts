// Firebase configuration for React Native
// This uses @react-native-firebase which is initialized via native config files

import { getApp } from '@react-native-firebase/app';
import { connectDatabaseEmulator, getDatabase } from '@react-native-firebase/database';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from '@react-native-firebase/functions';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0',
  authDomain: 'flipfeeds-app.firebaseapp.com',
  databaseURL: 'https://flipfeeds-app-default-rtdb.firebaseio.com',
  projectId: 'flipfeeds-app',
  storageBucket: 'flipfeeds-app.firebasestorage.app',
  messagingSenderId: '361402949529',
  appId: '1:361402949529:web:a197cc4ada3a64aaef3d08',
};

// Use emulators only in development mode
const USE_EMULATORS = process.env.USE_FIREBASE_EMULATORS === 'true' && __DEV__;

let isInitialized = false;

export const initializeFirebase = async () => {
  if (isInitialized) {
    console.log('🔥 Firebase already initialized');
    return;
  }

  console.log('🔥 Firebase initialization starting...');
  console.log(`   Environment: ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'}`);

  try {
    // Get the default Firebase app (initialized via native config)
    // This validates that the app is initialized
    getApp();

    // CRITICAL: Connect to emulators FIRST, before accessing any Firebase services
    if (USE_EMULATORS) {
      // Android emulator: use 10.0.2.2 (maps to localhost on host machine)
      // iOS simulator: use 'localhost'
      const host = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

      const functionsInstance = getFunctions();
      const firestoreInstance = getFirestore();
      const databaseInstance = getDatabase();

      connectFunctionsEmulator(functionsInstance, host, 5001);
      connectFirestoreEmulator(firestoreInstance, host, 8080);
      connectDatabaseEmulator(databaseInstance, host, 9000);

      console.log('✅ Firebase Emulators Connected');
      console.log(`   Platform: ${Platform.OS}`);
      console.log(`   Functions: http://${host}:5001`);
      console.log(`   Firestore: http://${host}:8080`);
      console.log(`   Database: http://${host}:9000`);
      console.log(`   Emulator UI: http://localhost:4000`);
    } else {
      console.log('🌐 Using production Firebase');
    }

    isInitialized = true;
    console.log('✅ Firebase initialization complete');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    throw error;
  }
};

// Export Firebase app instance
export const getFirebaseApp = () => getApp();
