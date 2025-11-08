// Firebase configuration
// For web, this is initialized automatically by @react-native-firebase
// For native platforms, GoogleService files are used

import { Platform } from 'react-native';
import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0",
    authDomain: "flipfeeds-app.firebaseapp.com",
    databaseURL: "https://flipfeeds-app-default-rtdb.firebaseio.com",
    projectId: "flipfeeds-app",
    storageBucket: "flipfeeds-app.firebasestorage.app",
    messagingSenderId: "361402949529",
    appId: "1:361402949529:web:a197cc4ada3a64aaef3d08"
};

// Use emulators only in development mode
// __DEV__ is true when running locally (npm/expo start), false in production builds
// const USE_EMULATORS = __DEV__;
const USE_EMULATORS = false; // Disable emulators for now
export const initializeFirebase = () => {
    console.log('🔥 Firebase initialization starting...');
    console.log(`   Environment: ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'}`);

    if (USE_EMULATORS) {
        // Connect to Firebase Emulators
        // Android emulator: use 10.0.2.2 (maps to localhost on host machine)
        // iOS simulator: use 'localhost'
        // Physical device: use your computer's IP address (e.g., '192.168.68.70')
        const host = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

        try {
            functions().useEmulator(host, 5001);
            firestore().useEmulator(host, 8080);

            console.log('✅ Firebase Emulators Connected');
            console.log(`   Platform: ${Platform.OS}`);
            console.log(`   Functions: http://${host}:5001`);
            console.log(`   Firestore: http://${host}:8080`);
            console.log(`   Emulator UI: http://localhost:4000`);
        } catch (error) {
            console.error('❌ Error connecting to emulators:', error);
        }
    } else {
        console.log('🌐 Using production Firebase');
    }
}

export { firebaseConfig };