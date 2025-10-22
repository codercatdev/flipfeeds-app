// Import the functions you need from the SDKs you need
import { Platform } from 'react-native';

import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getCrashlytics } from '@react-native-firebase/crashlytics';

const firebaseConfig = {
    apiKey: "AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0",
    authDomain: "flipfeeds-app.firebaseapp.com",
    projectId: "flipfeeds-app",
    storageBucket: "flipfeeds-app.firebasestorage.app",
    messagingSenderId: "361402949529",
    appId: "1:361402949529:web:93bddc0fc4208f97ef3d08"
};

if (Platform.OS === 'web') {
    const app = !getApps().length ? await initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
}
export const crashlytics = getCrashlytics();
