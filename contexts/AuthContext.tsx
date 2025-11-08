import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firestore from '@react-native-firebase/firestore';

type AuthContextType = {
    user: FirebaseAuthTypes.User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Configure Google Sign-In
        // Using iOS Client ID from GoogleService-Info.plist
        GoogleSignin.configure({
            iosClientId: '361402949529-r2043klm9rhlffk8hiutftkj6keh9th6.apps.googleusercontent.com',
            webClientId: '361402949529-g9a9tjuciarclra19mraq2hfe7jeongn.apps.googleusercontent.com',
        });

        const unsubscribe = auth().onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        try {
            // Check if device supports Google Play
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Get users ID token
            const { data } = await GoogleSignin.signIn();

            // If failed throw error
            if (!data) {
                throw new Error('Google Sign-In failed to provide user data');
            }

            const { idToken } = data;

            // Create a Google credential with the token
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);

            // Sign-in the user with the credential
            const userCredential = await auth().signInWithCredential(googleCredential);

            // Initialize user profile in Firestore if new user
            const userDoc = await firestore().collection('users').doc(userCredential.user.uid).get();

            if (!userDoc.exists()) {
                await firestore().collection('users').doc(userCredential.user.uid).set({
                    name: userCredential.user.displayName || 'User',
                    email: userCredential.user.email,
                    fitnessGoal: 'General Fitness',
                    dietaryPreference: 'No Restrictions',
                });
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
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
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