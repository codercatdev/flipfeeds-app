import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';

export default function OnboardingScreen() {
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const { user, completeOnboarding } = useAuth();
    const colorScheme = useColorScheme();

    const sanitizeUsername = (input: string) => {
        return input.toLowerCase().replace(/[^a-z0-9_]/g, '');
    };

    const handleUsernameChange = (text: string) => {
        const sanitized = sanitizeUsername(text);
        setUsername(sanitized);
        setIsAvailable(null); // Reset availability when typing
    };

    const checkUsernameAvailability = async () => {
        if (username.length < 3) {
            Alert.alert('Username too short', 'Username must be at least 3 characters long');
            return;
        }

        setIsChecking(true);
        try {
            const snapshot = await firestore()
                .collection('users')
                .where('username', '==', username)
                .get();

            setIsAvailable(snapshot.empty);

            if (!snapshot.empty) {
                Alert.alert('Username taken', 'This username is already in use. Please choose another.');
            }
        } catch (error) {
            console.error('Error checking username:', error);
            Alert.alert('Error', 'Failed to check username availability');
        } finally {
            setIsChecking(false);
        }
    };

    const handleContinue = async () => {
        if (!username || username.length < 3) {
            Alert.alert('Invalid username', 'Username must be at least 3 characters long');
            return;
        }

        if (isAvailable !== true) {
            Alert.alert('Check availability', 'Please check if your username is available first');
            return;
        }

        try {
            await completeOnboarding(username);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to complete onboarding');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-black"
        >
            <View className="flex-1 p-6 justify-center">
                <View className="flex-row items-center mb-2">
                    <Ionicons name="sparkles" size={32} color="#F97316" style={{ marginRight: 8 }} />
                    <Text className="text-3xl font-bold text-black dark:text-white">
                        Welcome to FlipFeeds!
                    </Text>
                </View>
                <Text className="text-base text-black/60 dark:text-white/60 mb-8">
                    Choose a unique username to get started. You'll be able to change it later, but you can only do so once every 7 days.
                </Text>

                <Text className="text-sm font-semibold mb-2 text-black dark:text-white">
                    Username
                </Text>
                <View className="flex-row mb-4">
                    <View className="bg-white dark:bg-black px-4 py-3 rounded-l-lg border border-r-0 border-black/20 dark:border-white/20">
                        <Text className="text-base text-black/60 dark:text-white/60">
                            @
                        </Text>
                    </View>
                    <TextInput
                        className="flex-1 h-12 bg-white dark:bg-black px-4 text-base text-black dark:text-white border border-l-0 border-black/20 dark:border-white/20 rounded-r-lg"
                        placeholder="username"
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={username}
                        onChangeText={handleUsernameChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                    />
                </View>

                <Text className="text-xs text-black/60 dark:text-white/60 mb-4">
                    Only lowercase letters, numbers, and underscores. Min 3 characters.
                </Text>

                <TouchableOpacity
                    className="bg-primary p-4 rounded-lg items-center mb-3"
                    style={{ opacity: username.length < 3 || isChecking ? 0.5 : 1 }}
                    onPress={checkUsernameAvailability}
                    disabled={username.length < 3 || isChecking}
                >
                    {isChecking ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text className="text-white text-base font-semibold">
                            Check Availability
                        </Text>
                    )}
                </TouchableOpacity>

                {isAvailable === true && (
                    <View className="bg-primary/10 p-3 rounded-lg mb-4 border border-primary flex-row items-center justify-center">
                        <Ionicons name="checkmark-circle" size={20} color="#F97316" style={{ marginRight: 8 }} />
                        <Text className="text-primary font-semibold">
                            Username available!
                        </Text>
                    </View>
                )}

                {isAvailable === false && (
                    <View className="bg-black dark:bg-white p-3 rounded-lg mb-4 border border-black dark:border-white flex-row items-center justify-center">
                        <Ionicons name="close-circle" size={20} color={colorScheme === 'dark' ? '#000' : '#fff'} style={{ marginRight: 8 }} />
                        <Text className="text-white dark:text-black font-semibold">
                            Username already taken
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    className="bg-primary p-4 rounded-lg items-center"
                    style={{ opacity: isAvailable === true ? 1 : 0.5 }}
                    onPress={handleContinue}
                    disabled={isAvailable !== true}
                >
                    <Text className="text-white text-base font-semibold">
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
