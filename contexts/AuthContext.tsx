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
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateFCMToken: () => Promise<void>;
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
                            displayName: data?.displayName || user.displayName || '',
                            email: data?.email || user.email || '',
                            photoURL: data?.photoURL || user.photoURL || '',
                            fcmToken: data?.fcmToken || '',
                            createdAt: data?.createdAt || Date.now(),
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
        photoURL?: string
    ) => {
        const fcmToken = await messaging().getToken().catch(() => '');
        const userProfile: User = {
            uid,
            displayName,
            email: email || '',
            photoURL: photoURL || '',
            fcmToken,
            createdAt: Date.now(),
        };
        await firestore().collection('users').doc(uid).set(userProfile);
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            const userCredential = await auth().createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            await createUserProfile(userCredential.user.uid, email, displayName);
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
                await createUserProfile(
                    userCredential.user.uid,
                    userCredential.user.email,
                    userCredential.user.displayName || 'User',
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

    return (
        <AuthContext.Provider value={{
            user,
            userDoc,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signOut,
            updateFCMToken
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
