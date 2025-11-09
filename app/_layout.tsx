import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '@/lib/firebaseConfig';

function RootLayoutNav() {
    const colorScheme = useColorScheme();
    const { user, loading, updateFCMToken } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    // Initialize Firebase
    useEffect(() => {
        initializeFirebase();
    }, []);

    // Handle FCM token refresh
    useEffect(() => {
        const unsubscribe = messaging().onTokenRefresh((token) => {
            console.log('FCM token refreshed:', token);
            updateFCMToken();
        });

        return unsubscribe;
    }, []);

    // Handle foreground messages
    useEffect(() => {
        const unsubscribe = messaging().onMessage(async (remoteMessage) => {
            console.log('Foreground message received:', remoteMessage);
            // Handle the notification while app is in foreground
            // You could show an in-app notification here
        });

        return unsubscribe;
    }, []);

    // Handle redirects based on authentication state
    useEffect(() => {
        if (loading) {
            return;
        }

        const inAuthGroup = segments[0] === '(auth)';

        if (!user) {
            // User not authenticated - ensure they're on login page
            if (!inAuthGroup) {
                console.log('Redirecting to login, segments:', segments);
                router.replace('/(auth)/login');
            } else {
                console.log('Already in auth group, segments:', segments);
            }
        } else if (user && inAuthGroup) {
            // User authenticated but in auth group - redirect to tabs
            console.log('Redirecting to tabs, segments:', segments);
            router.replace('/(tabs)');
        } else {
            console.log('User logged in and in correct location, segments:', segments);
        }
    }, [user, loading, segments]);

    // Show loading screen until auth is checked
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Add Friend' }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </SafeAreaProvider>
    );
}

