import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const { signInWithGoogle } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            console.error('Sign-in error:', error);
            Alert.alert('Sign-In Error', error.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
                    FlipFeeds
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
                    Your AI-Powered Fitness & Nutrition Companion
                </Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.googleButton, loading && styles.buttonDisabled]}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <View style={styles.googleIconContainer}>
                                    <Text style={styles.googleIcon}>G</Text>
                                </View>
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.infoText, { color: isDark ? '#666' : '#999' }]}>
                        Sign in to get personalized fitness and nutrition tips powered by AI
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 48,
    },
    buttonContainer: {
        width: '100%',
    },
    googleButton: {
        backgroundColor: '#fff',
        height: 50,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    googleIconContainer: {
        width: 24,
        height: 24,
        marginRight: 12,
        backgroundColor: '#fff',
        borderRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4285F4',
    },
    googleButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '500',
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 20,
    },
});