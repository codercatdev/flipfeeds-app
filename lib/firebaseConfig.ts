// Import the functions you need from the SDKs you need
import { Platform } from 'react-native';

import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { initializeAuth } from '@react-native-firebase/auth';
import { initializeFirestore } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0",
    authDomain: "flipfeeds-app.firebaseapp.com",
    databaseURL: "https://flipfeeds-app-default-rtdb.firebaseio.com",
    projectId: "flipfeeds-app",
    storageBucket: "flipfeeds-app.firebasestorage.app",
    messagingSenderId: "361402949529",
    appId: "1:361402949529:web:a197cc4ada3a64aaef3d08"
};

export const initializeFirebase = async () => {
    // Initialize Firebase
    if (Platform.OS === 'web') {
        const app = !getApps().length ? await initializeApp(firebaseConfig) : getApp();
        initializeAuth(app, {
            persistence: AsyncStorage,
        });
        initializeFirestore(app, { experimentalForceLongPolling: true });
    }
}