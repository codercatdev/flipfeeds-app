import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import firestore from '@react-native-firebase/firestore';

type UserProfile = {
    name: string;
    fitnessGoal: string;
    dietaryPreference: string;
};

const FITNESS_GOALS = [
    'Weight Loss',
    'Muscle Gain',
    'General Fitness',
    'Endurance',
    'Flexibility',
];

const DIETARY_PREFERENCES = [
    'No Restrictions',
    'Vegetarian',
    'Vegan',
    'Keto',
    'Paleo',
    'Gluten-Free',
];

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        fitnessGoal: '',
        dietaryPreference: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        if (!user) return;

        try {
            const doc = await firestore().collection('users').doc(user.uid).get();
            if (doc.exists()) {
                const data = doc.data() as UserProfile;
                setProfile(data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await firestore().collection('users').doc(user.uid).set(profile);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
            edges={['top', 'left', 'right']}
        >
            <ScrollView
                contentContainerStyle={styles.content}
            >
                <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Profile</Text>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: isDark ? '#aaa' : '#666' }]}>Name</Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                                color: isDark ? '#fff' : '#000',
                                borderColor: isDark ? '#333' : '#ddd',
                            },
                        ]}
                        value={profile.name}
                        onChangeText={(text) => setProfile({ ...profile, name: text })}
                        placeholder="Your name"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: isDark ? '#aaa' : '#666' }]}>
                        Fitness Goal
                    </Text>
                    <View style={styles.optionsContainer}>
                        {FITNESS_GOALS.map((goal) => (
                            <TouchableOpacity
                                key={goal}
                                style={[
                                    styles.option,
                                    {
                                        backgroundColor:
                                            profile.fitnessGoal === goal
                                                ? '#007AFF'
                                                : isDark
                                                    ? '#1a1a1a'
                                                    : '#f5f5f5',
                                        borderColor: isDark ? '#333' : '#ddd',
                                    },
                                ]}
                                onPress={() => setProfile({ ...profile, fitnessGoal: goal })}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        {
                                            color:
                                                profile.fitnessGoal === goal
                                                    ? '#fff'
                                                    : isDark
                                                        ? '#fff'
                                                        : '#000',
                                        },
                                    ]}
                                >
                                    {goal}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: isDark ? '#aaa' : '#666' }]}>
                        Dietary Preference
                    </Text>
                    <View style={styles.optionsContainer}>
                        {DIETARY_PREFERENCES.map((preference) => (
                            <TouchableOpacity
                                key={preference}
                                style={[
                                    styles.option,
                                    {
                                        backgroundColor:
                                            profile.dietaryPreference === preference
                                                ? '#007AFF'
                                                : isDark
                                                    ? '#1a1a1a'
                                                    : '#f5f5f5',
                                        borderColor: isDark ? '#333' : '#ddd',
                                    },
                                ]}
                                onPress={() =>
                                    setProfile({ ...profile, dietaryPreference: preference })
                                }
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        {
                                            color:
                                                profile.dietaryPreference === preference
                                                    ? '#fff'
                                                    : isDark
                                                        ? '#fff'
                                                        : '#000',
                                        },
                                    ]}
                                >
                                    {preference}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.buttonDisabled]}
                    onPress={saveProfile}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    signOutButton: {
        backgroundColor: '#FF3B30',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    signOutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
