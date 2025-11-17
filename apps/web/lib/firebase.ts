import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD1573e-6QA1z7pzcCVZS8FJjYb3Kywcy0',
  authDomain: 'flipfeeds-app.firebaseapp.com',
  databaseURL: 'https://flipfeeds-app-default-rtdb.firebaseio.com',
  projectId: 'flipfeeds-app',
  storageBucket: 'flipfeeds-app.firebasestorage.app',
  messagingSenderId: '361402949529',
  appId: '1:361402949529:web:a197cc4ada3a64aaef3d08',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Enable persistence so auth state survives page reloads and redirects
void setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to set persistence:', err);
});

export { app, auth };
