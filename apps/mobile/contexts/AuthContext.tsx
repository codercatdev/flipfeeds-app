import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    updateProfile,
} from '@react-native-firebase/auth';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
} from '@react-native-firebase/firestore';
import {
    AuthorizationStatus,
    getMessaging,
    getToken,
    requestPermission,
} from '@react-native-firebase/messaging';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';

type AuthContextType = {
    user: FirebaseAuthTypes.User | null;
    userDoc: User | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (
        email: string,
        password: string,
        displayName: string,
        username: string
    ) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateFCMToken: () => Promise<void>;
    completeOnboarding: (username: string) => Promise<void>;
    updateUsername: (newUsername: string) => Promise<void>;
    canChangeUsername: () => { canChange: boolean; daysRemaining: number };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [userDoc, setUserDoc] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        GoogleSignin.configure({
            iosClientId: '361402949529-r2043klm9rhlffk8hiutftkj6keh9th6.apps.googleusercontent.com',
            webClientId: '361402949529-g9a9tjuciarclra19mraq2hfe7jeongn.apps.googleusercontent.com',
        });

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) {
            setUserDoc(null);
            return;
        }

        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(
            userRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserDoc({
                        uid: user.uid,
                        username: data?.username,
                        displayName: data?.displayName || user.displayName || '',
                        email: data?.email || user.email || '',
                        photoURL: data?.photoURL || user.photoURL || '',
                        fcmToken: data?.fcmToken || '',
                        createdAt: data?.createdAt || Date.now(),
                        hasCompletedOnboarding: data?.hasCompletedOnboarding || false,
                        usernameLastChanged: data?.usernameLastChanged,
                    });
                } else {
                    setUserDoc(null);
                }
            },
            (error) => {
                console.error('Error listening to user profile:', error);
                setUserDoc(null);
            }
        );

        return () => unsubscribe();
    }, [user]);

    const updateFCMToken = async () => {
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const messaging = getMessaging();
            const authStatus = await requestPermission(messaging);
            const enabled =
                authStatus === AuthorizationStatus.AUTHORIZED ||
                authStatus === AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                const fcmToken = await getToken(messaging);
                const db = getFirestore();
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, { fcmToken });
                console.log('✅ FCM token updated:', fcmToken);
            }
        } catch (error) {
            console.error('Error updating FCM token:', error);
        }
    };

    const createUserProfile = async (
        uid: string,
        email: string | null,
        displayName: string,
        username?: string,
        photoURL?: string
    ) => {
        const messaging = getMessaging();
        const fcmToken = await getToken(messaging).catch(() => '');
        const userProfile: Partial<User> = {
            uid,
            displayName,
            email: email || '',
            photoURL: photoURL || '',
            fcmToken,
            createdAt: Date.now(),
        };

        // If username is provided, user has completed onboarding
        if (username) {
            userProfile.username = username.toLowerCase();
            userProfile.hasCompletedOnboarding = true;
            userProfile.usernameLastChanged = Date.now();
        } else {
            userProfile.hasCompletedOnboarding = false;
        }

        const db = getFirestore();
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, userProfile);

        // Track username change in history if username provided
        if (username) {
            const historyRef = collection(db, 'users', uid, 'usernameHistory');
            await addDoc(historyRef, {
                oldUsername: null,
                newUsername: username.toLowerCase(),
                timestamp: Date.now(),
            });
        }
    };

    const signUpWithEmail = async (
        email: string,
        password: string,
        displayName: string,
        username: string
    ) => {
        try {
            // Note: This is the old signup flow - keeping for backward compatibility
            // New users should go through onboarding instead
            // Check if username is already taken
            const db = getFirestore();
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username.toLowerCase()));
            const usernameCheck = await getDocs(q);

            if (!usernameCheck.empty) {
                throw new Error('Username already taken');
            }

            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            await createUserProfile(
                userCredential.user.uid,
                email,
                displayName,
                username.toLowerCase()
            );
        } catch (error) {
            console.error('Email Sign-Up Error:', error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Email Sign-In Error:', error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const { data } = await GoogleSignin.signIn();
            if (!data) {
                throw new Error('Google Sign-In failed to provide user data');
            }
            const { idToken } = data;
            const googleCredential = GoogleAuthProvider.credential(idToken);
            const auth = getAuth();
            const userCredential = await signInWithCredential(auth, googleCredential);

            const db = getFirestore();
            const userRef = doc(db, 'users', userCredential.user.uid);
            const userDocSnap = await getDoc(userRef);

            if (!userDocSnap.exists()) {
                // Create user profile without username - they'll go through onboarding
                await createUserProfile(
                    userCredential.user.uid,
                    userCredential.user.email,
                    userCredential.user.displayName || 'User',
                    undefined,
                    userCredential.user.photoURL || ''
                );
            }
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await GoogleSignin.signOut();
            const auth = getAuth();
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Sign Out Error:', error);
            throw error;
        }
    };

    const completeOnboarding = async (username: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No user logged in');
        }

        const sanitizedUsername = username.toLowerCase();

        // Check if username is already taken
        const db = getFirestore();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', sanitizedUsername));
        const usernameCheck = await getDocs(q);

        if (!usernameCheck.empty) {
            throw new Error('Username already taken');
        }

        const now = Date.now();

        // Update user profile with username and mark onboarding complete
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            username: sanitizedUsername,
            hasCompletedOnboarding: true,
            usernameLastChanged: now,
        });

        // Track username change in history
        const historyRef = collection(db, 'users', currentUser.uid, 'usernameHistory');
        await addDoc(historyRef, {
            oldUsername: null,
            newUsername: sanitizedUsername,
            timestamp: now,
        });
    };

    const canChangeUsername = (): { canChange: boolean; daysRemaining: number } => {
        if (!userDoc?.usernameLastChanged) {
            return { canChange: true, daysRemaining: 0 };
        }

        const daysSinceChange = (Date.now() - userDoc.usernameLastChanged) / (1000 * 60 * 60 * 24);
        const daysRemaining = Math.max(0, Math.ceil(7 - daysSinceChange));

        return {
            canChange: daysSinceChange >= 7,
            daysRemaining,
        };
    };

    const updateUsername = async (newUsername: string) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser || !userDoc) {
            throw new Error('No user logged in');
        }

        const { canChange, daysRemaining } = canChangeUsername();
        if (!canChange) {
            throw new Error(
                `You can only change your username once every 7 days. Please wait ${daysRemaining} more day(s).`
            );
        }

        const sanitizedUsername = newUsername.toLowerCase();

        // Check if username is already taken
        const db = getFirestore();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', sanitizedUsername));
        const usernameCheck = await getDocs(q);

        if (!usernameCheck.empty) {
            throw new Error('Username already taken');
        }

        const now = Date.now();
        const oldUsername = userDoc.username;

        // Update user profile with new username
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            username: sanitizedUsername,
            usernameLastChanged: now,
        });

        // Track username change in history
        const historyRef = collection(db, 'users', currentUser.uid, 'usernameHistory');
        await addDoc(historyRef, {
            oldUsername: oldUsername || null,
            newUsername: sanitizedUsername,
            timestamp: now,
        });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userDoc,
                loading,
                signInWithEmail,
                signUpWithEmail,
                signInWithGoogle,
                signOut,
                updateFCMToken,
                completeOnboarding,
                updateUsername,
                canChangeUsername,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
