import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';
import '../global.css';

import { initializeFirebase } from '@flip-feeds/firebase-config/native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userDoc, loading, updateFCMToken } = useAuth();
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
  }, [updateFCMToken]);

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
    const currentRoute = segments.join('/');

    if (!user) {
      // User not authenticated - ensure they're on login page
      if (!inAuthGroup) {
        console.log('Redirecting to login, segments:', segments);
        router.replace('/(auth)/login');
      } else {
        console.log('Already in auth group, segments:', segments);
      }
    } else if (user) {
      // User is authenticated - wait for userDoc to load before redirecting
      if (!userDoc) {
        console.log('User authenticated but userDoc still loading...');
        return;
      }

      // User authenticated and userDoc loaded - check onboarding status
      if (!userDoc.hasCompletedOnboarding) {
        // User needs to complete onboarding
        if (!currentRoute.includes('onboarding')) {
          console.log('Redirecting to onboarding, segments:', segments);
          router.replace('/(auth)/onboarding');
        }
      } else if (inAuthGroup) {
        // User completed onboarding but still in auth group - redirect to tabs
        console.log('Redirecting to tabs, segments:', segments);
        router.replace('/(tabs)');
      } else {
        console.log('User logged in and in correct location, segments:', segments);
      }
    }
  }, [user, userDoc, loading, segments, router.replace]);

  // Show loading screen until auth is checked
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
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
