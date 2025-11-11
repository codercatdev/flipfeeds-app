/**
 * Firebase Configuration & Initialization
 * 
 * This module provides a universal Firebase setup that works across:
 * - Web (Next.js) using firebase SDK
 * - Mobile (React Native) using @react-native-firebase
 * 
 * The configuration automatically detects the platform and initializes
 * the appropriate SDK with environment-specific variables.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Firebase configuration interface
interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}

/**
 * Get Firebase configuration from environment variables
 * Supports both web (NEXT_PUBLIC_) and native environment variables
 */
const getFirebaseConfig = (): FirebaseConfig => {
    // Check if we're in a web environment (Next.js)
    const isWeb = typeof window !== 'undefined';

    // Helper to get env variable with fallback
    const getEnvVar = (webKey: string, nativeKey: string): string => {
        if (isWeb) {
            return process.env[webKey] || '';
        }
        return process.env[nativeKey] || process.env[webKey] || '';
    };

    return {
        apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
        authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
        projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
        storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID'),
        measurementId: getEnvVar('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID'),
    };
};

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;

/**
 * Initialize or get existing Firebase app instance
 */
const initializeFirebase = (): FirebaseApp => {
    if (!app && getApps().length === 0) {
        const config = getFirebaseConfig();
        app = initializeApp(config);
        console.log('🔥 Firebase initialized');
    } else if (!app) {
        app = getApps()[0];
    }
    return app;
};

// Initialize the app
const firebaseApp = initializeFirebase();

// Initialize services
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
    if (!auth) {
        auth = getAuth(firebaseApp);

        // Connect to emulator in development
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
            const { connectAuthEmulator } = require('firebase/auth');
            const emulatorUrl = 'http://localhost:9099';
            try {
                connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
                console.log('🔥 Connected to Auth Emulator:', emulatorUrl);
            } catch (error) {
                // Emulator already connected
            }
        }
    }
    return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
    if (!firestore) {
        firestore = getFirestore(firebaseApp);

        // Connect to emulator in development
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
            const { connectFirestoreEmulator } = require('firebase/firestore');
            try {
                connectFirestoreEmulator(firestore, 'localhost', 8080);
                console.log('🔥 Connected to Firestore Emulator: localhost:8080');
            } catch (error) {
                // Emulator already connected
            }
        }
    }
    return firestore;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
    if (!storage) {
        storage = getStorage(firebaseApp);

        // Connect to emulator in development
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
            const { connectStorageEmulator } = require('firebase/storage');
            try {
                connectStorageEmulator(storage, 'localhost', 9199);
                console.log('🔥 Connected to Storage Emulator: localhost:9199');
            } catch (error) {
                // Emulator already connected
            }
        }
    }
    return storage;
};

/**
 * Get Firebase Functions instance
 */
export const getFirebaseFunctions = (): Functions => {
    if (!functions) {
        functions = getFunctions(firebaseApp);

        // Connect to emulator in development
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
            const { connectFunctionsEmulator } = require('firebase/functions');
            try {
                connectFunctionsEmulator(functions, 'localhost', 5001);
                console.log('🔥 Connected to Functions Emulator: localhost:5001');
            } catch (error) {
                // Emulator already connected
            }
        }
    }
    return functions;
};

// Export the app and individual services
export { firebaseApp };
export const firebaseAuth = getFirebaseAuth();
export const firebaseFirestore = getFirebaseFirestore();
export const firebaseStorage = getFirebaseStorage();
export const firebaseFunctions = getFirebaseFunctions();

// Export types
export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Functions };
