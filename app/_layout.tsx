import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '@/lib/firebaseConfig';

function RootLayoutNav() {
    const colorScheme = useColorScheme();
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    // Initialize Firebase
    useEffect(() => {
        initializeFirebase();
    }, []);

    // Handle redirects based on authentication state
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Redirect to login if not authenticated and not in auth group
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            // Redirect to tabs if authenticated and in auth group
            router.replace('/(tabs)');
        }

        // Mark navigation as ready after first auth check
        setIsNavigationReady(true);
    }, [user, loading, segments]);

    // Show loading screen until auth is checked and navigation is ready
    if (loading || !isNavigationReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' }
                }}
            >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
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
