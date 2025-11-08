// Firebase configuration
// For web, this is initialized automatically by @react-native-firebase
// For native platforms, GoogleService files are used

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
    // No-op for now - Firebase is initialized via GoogleService files on native
    // and automatically on web via @react-native-firebase
    console.log('Firebase initialized');
}

export { firebaseConfig };