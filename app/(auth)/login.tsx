import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
    // Note: This screen uses the legacy signup flow with username.
    // New Google sign-in users will go through onboarding to set their username.
    // This keeps backward compatibility for email signup.
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

    const handleEmailAuth = async () => {
        if (!email || !password || (isSignUp && (!displayName || !username))) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password, displayName, username);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            Alert.alert('Authentication Error', error.message || 'Failed to authenticate');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Google Sign-in error:', error);
            Alert.alert('Sign-In Error', error.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black" style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo and Title */}
                    <View className="items-center mb-12">
                        <Text className="text-6xl mb-4">🔄</Text>
                        <Text className="text-4xl font-bold text-black dark:text-white mb-2">
                            FlipFeeds
                        </Text>
                        <Text className="text-base text-black/60 dark:text-white/60 text-center">
                            Social feeds are noise. FlipFeeds is a ping.
                        </Text>
                    </View>

                    {/* Email/Password Form */}
                    <View className="mb-6">
                        {isSignUp && (
                            <>
                                <TextInput
                                    className="bg-white dark:bg-black border border-black/20 dark:border-white/20 text-black dark:text-white px-4 py-3 rounded-lg mb-4"
                                    placeholder="Display Name"
                                    placeholderTextColor="rgba(0,0,0,0.4)"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    autoCapitalize="words"
                                />
                                <TextInput
                                    className="bg-white dark:bg-black border border-black/20 dark:border-white/20 text-black dark:text-white px-4 py-3 rounded-lg mb-4"
                                    placeholder="Username (e.g., johndoe)"
                                    placeholderTextColor="rgba(0,0,0,0.4)"
                                    value={username}
                                    onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </>
                        )}
                        <TextInput
                            className="bg-white dark:bg-black border border-black/20 dark:border-white/20 text-black dark:text-white px-4 py-3 rounded-lg mb-4"
                            placeholder="Email"
                            placeholderTextColor="rgba(0,0,0,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            className="bg-white dark:bg-black border border-black/20 dark:border-white/20 text-black dark:text-white px-4 py-3 rounded-lg"
                            placeholder="Password"
                            placeholderTextColor="rgba(0,0,0,0.4)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {/* Sign In/Up Button */}
                    <TouchableOpacity
                        className="bg-primary py-4 rounded-lg mb-4"
                        onPress={handleEmailAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-center font-semibold text-lg">
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Toggle Sign In/Up */}
                    <TouchableOpacity
                        className="mb-6"
                        onPress={() => setIsSignUp(!isSignUp)}
                        disabled={loading}
                    >
                        <Text className="text-primary text-center">
                            {isSignUp
                                ? 'Already have an account? Sign In'
                                : "Don't have an account? Sign Up"}
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center mb-6">
                        <View className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                        <Text className="mx-4 text-black/50 dark:text-white/50">OR</Text>
                        <View className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                    </View>

                    {/* Google Sign In */}
                    <TouchableOpacity
                        className="bg-white dark:bg-black border border-black/20 dark:border-white/20 py-4 rounded-lg flex-row items-center justify-center"
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <Text className="text-xl mr-3">G</Text>
                        <Text className="text-black dark:text-white font-semibold text-lg">
                            Sign in with Google
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
