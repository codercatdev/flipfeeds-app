import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';

export default function OnboardingScreen() {
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const { user, completeOnboarding } = useAuth();

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
            style={{ flex: 1, backgroundColor: '#ffffff' }}
        >
            <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#000000' }}>
                    Welcome to FlipFeeds! 🎉
                </Text>
                <Text style={{ fontSize: 16, color: '#666666', marginBottom: 32 }}>
                    Choose a unique username to get started. You'll be able to change it later, but you can only do so once every 7 days.
                </Text>

                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000000' }}>
                    Username
                </Text>
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <Text style={{
                        fontSize: 16,
                        color: '#666666',
                        paddingVertical: 12,
                        paddingLeft: 16,
                        backgroundColor: '#f5f5f5',
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                        borderWidth: 1,
                        borderRightWidth: 0,
                        borderColor: '#e0e0e0'
                    }}>
                        @
                    </Text>
                    <TextInput
                        style={{
                            flex: 1,
                            height: 48,
                            borderWidth: 1,
                            borderLeftWidth: 0,
                            borderColor: '#e0e0e0',
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                            paddingHorizontal: 16,
                            fontSize: 16,
                            backgroundColor: '#f5f5f5',
                            color: '#000000'
                        }}
                        placeholder="username"
                        placeholderTextColor="#999999"
                        value={username}
                        onChangeText={handleUsernameChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                    />
                </View>

                <Text style={{ fontSize: 12, color: '#666666', marginBottom: 16 }}>
                    Only lowercase letters, numbers, and underscores. Min 3 characters.
                </Text>

                <TouchableOpacity
                    style={{
                        backgroundColor: '#007AFF',
                        padding: 16,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginBottom: 12,
                        opacity: username.length < 3 || isChecking ? 0.5 : 1
                    }}
                    onPress={checkUsernameAvailability}
                    disabled={username.length < 3 || isChecking}
                >
                    {isChecking ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                            Check Availability
                        </Text>
                    )}
                </TouchableOpacity>

                {isAvailable === true && (
                    <View style={{
                        backgroundColor: '#D4EDDA',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#C3E6CB'
                    }}>
                        <Text style={{ color: '#155724', textAlign: 'center', fontWeight: '600' }}>
                            ✓ Username available!
                        </Text>
                    </View>
                )}

                {isAvailable === false && (
                    <View style={{
                        backgroundColor: '#F8D7DA',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#F5C6CB'
                    }}>
                        <Text style={{ color: '#721C24', textAlign: 'center', fontWeight: '600' }}>
                            ✗ Username already taken
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={{
                        backgroundColor: '#34C759',
                        padding: 16,
                        borderRadius: 8,
                        alignItems: 'center',
                        opacity: isAvailable === true ? 1 : 0.5
                    }}
                    onPress={handleContinue}
                    disabled={isAvailable !== true}
                >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
