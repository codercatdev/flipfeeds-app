// Firebase configuration
// For web, this is initialized automatically by @react-native-firebase
// For native platforms, GoogleService files are used

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

// Set to true to use local emulators for testing
const USE_EMULATORS = true;

export const initializeFirebase = async () => {
    console.log('Firebase initialized');

    if (USE_EMULATORS) {
        // Connect to Firebase Emulators
        // Android emulator: use 10.0.2.2 (maps to localhost on host machine)
        // iOS simulator: use 'localhost'
        // Physical device: use your computer's IP address (e.g., '192.168.68.70')
        const host = '10.0.2.2'; // Android emulator

        functions().useEmulator(host, 5001);
        firestore().useEmulator(host, 8080);

        console.log('🔧 Using Firebase Emulators');
        console.log(`   Functions: http://${host}:5001`);
        console.log(`   Firestore: http://${host}:8080`);
        console.log(`   Emulator UI: http://localhost:4000`);
    }
}

export { firebaseConfig };