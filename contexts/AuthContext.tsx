import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { User } from '@/types';

type AuthContextType = {
    user: FirebaseAuthTypes.User | null;
    userDoc: User | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string, username: string) => Promise<void>;
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

        const unsubscribe = auth().onAuthStateChanged((authUser) => {
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

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(
                (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
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
            const currentUser = auth().currentUser;
            if (!currentUser) return;

            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                const fcmToken = await messaging().getToken();
                await firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .update({ fcmToken });
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
        const fcmToken = await messaging().getToken().catch(() => '');
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
        
        await firestore().collection('users').doc(uid).set(userProfile);
        
        // Track username change in history if username provided
        if (username) {
            await firestore()
                .collection('users')
                .doc(uid)
                .collection('usernameHistory')
                .add({
                    oldUsername: null,
                    newUsername: username.toLowerCase(),
                    timestamp: Date.now(),
                });
        }
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string, username: string) => {
        try {
            // Note: This is the old signup flow - keeping for backward compatibility
            // New users should go through onboarding instead
            // Check if username is already taken
            const usernameCheck = await firestore()
                .collection('users')
                .where('username', '==', username.toLowerCase())
                .get();
            
            if (!usernameCheck.empty) {
                throw new Error('Username already taken');
            }

            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            await createUserProfile(userCredential.user.uid, email, displayName, username.toLowerCase());
        } catch (error) {
            console.error('Email Sign-Up Error:', error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            await auth().signInWithEmailAndPassword(email, password);
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
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(googleCredential);
            const userDocSnap = await firestore().collection('users').doc(userCredential.user.uid).get();
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
            await auth().signOut();
        } catch (error) {
            console.error('Sign Out Error:', error);
            throw error;
        }
    };

    const completeOnboarding = async (username: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) {
            throw new Error('No user logged in');
        }

        const sanitizedUsername = username.toLowerCase();

        // Check if username is already taken
        const usernameCheck = await firestore()
            .collection('users')
            .where('username', '==', sanitizedUsername)
            .get();

        if (!usernameCheck.empty) {
            throw new Error('Username already taken');
        }

        const now = Date.now();

        // Update user profile with username and mark onboarding complete
        await firestore().collection('users').doc(currentUser.uid).update({
            username: sanitizedUsername,
            hasCompletedOnboarding: true,
            usernameLastChanged: now,
        });

        // Track username change in history
        await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('usernameHistory')
            .add({
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
        const currentUser = auth().currentUser;
        if (!currentUser || !userDoc) {
            throw new Error('No user logged in');
        }

        const { canChange, daysRemaining } = canChangeUsername();
        if (!canChange) {
            throw new Error(`You can only change your username once every 7 days. Please wait ${daysRemaining} more day(s).`);
        }

        const sanitizedUsername = newUsername.toLowerCase();

        // Check if username is already taken
        const usernameCheck = await firestore()
            .collection('users')
            .where('username', '==', sanitizedUsername)
            .get();

        if (!usernameCheck.empty) {
            throw new Error('Username already taken');
        }

        const now = Date.now();
        const oldUsername = userDoc.username;

        // Update user profile with new username
        await firestore().collection('users').doc(currentUser.uid).update({
            username: sanitizedUsername,
            usernameLastChanged: now,
        });

        // Track username change in history
        await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .collection('usernameHistory')
            .add({
                oldUsername: oldUsername || null,
                newUsername: sanitizedUsername,
                timestamp: now,
            });
    };

    return (
        <AuthContext.Provider value={{
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
            canChangeUsername
        }}>
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
