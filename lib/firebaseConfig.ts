// Firebase configuration
// React Native Firebase v23+ - Using current stable API
// Note: Deprecation warnings are expected and will be addressed in future v24+ release

import { Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from '@react-native-firebase/database';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import analytics from '@react-native-firebase/analytics';
import { initializeAppCheck } from '@react-native-firebase/app-check';
import inAppMessaging from '@react-native-firebase/in-app-messaging';
import remoteConfig from '@react-native-firebase/remote-config';

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
const USE_EMULATORS = __DEV__;
// const USE_EMULATORS = false; // Disable emulators for now

let isInitialized = false;

export const initializeFirebase = async () => {
    if (isInitialized) {
        console.log('🔥 Firebase already initialized');
        return;
    }

    console.log('🔥 Firebase initialization starting...');
    console.log(`   Environment: ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'}`);

    try {
        // Get the default Firebase app
        const app = getApp();

        // CRITICAL: Connect to emulators FIRST, before accessing any Firebase services
        if (USE_EMULATORS) {
            // Android emulator: use 10.0.2.2 (maps to localhost on host machine)
            // iOS simulator: use 'localhost'
            // Physical device: use your computer's IP address (e.g., '192.168.68.70')
            const host = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

            const functionsInstance = getFunctions(app);
            const firestoreInstance = getFirestore(app);
            const databaseInstance = getDatabase(app);

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

        // Initialize App Check for production
        if (!__DEV__) {
            await initializeAppCheck(app, {
                provider: 'playIntegrity', // Android
                isTokenAutoRefreshEnabled: true,
            });
            console.log('✅ App Check initialized');
        }

        // Initialize Crashlytics  
        await crashlytics().setCrashlyticsCollectionEnabled(true);
        console.log('✅ Crashlytics enabled');

        // Initialize Performance Monitoring
        await perf().setPerformanceCollectionEnabled(true);
        console.log('✅ Performance Monitoring enabled');

        // Initialize Analytics
        await analytics().setAnalyticsCollectionEnabled(true);
        console.log('✅ Analytics enabled');

        // Initialize Remote Config with defaults
        await remoteConfig().setDefaults({
            flip_prompt_template: 'Generate a single, short, SFW piece of micro-content. It could be a weird fact, a 1-sentence joke, or a bizarre compliment. Be quirky and fun. Keep it under 100 characters.',
        });

        // Set config settings for development
        await remoteConfig().setConfigSettings({
            minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000, // 0 in dev, 1 hour in prod
        });

        // Fetch and activate remote config
        await remoteConfig().fetchAndActivate();
        console.log('✅ Remote Config initialized');

        // Initialize In-App Messaging
        await inAppMessaging().setMessagesDisplaySuppressed(false);
        console.log('✅ In-App Messaging enabled');

        isInitialized = true;
        console.log('✅ Firebase initialization complete');
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        throw error;
    }
}

export { firebaseConfig };