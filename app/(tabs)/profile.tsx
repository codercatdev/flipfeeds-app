import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@react-native-firebase/storage';
import ml from '@react-native-firebase/ml';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';

export default function ProfileScreen() {
    const { user, userDoc, signOut, updateUsername, canChangeUsername } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [labels, setLabels] = useState<string[]>([]);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

    const handlePickImage = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
            if (result.didCancel || !result.assets || !result.assets[0]) return;

            const asset = result.assets[0];
            const uri = asset.uri;
            if (!uri) return;

            setUploading(true);

            // ML Kit Image Labeling Demo
            try {
                const detectedLabels = await ml().cloudImageLabelerProcessImage(uri);
                const topLabels = detectedLabels.slice(0, 3).map(label => label.text);
                setLabels(topLabels);
                Alert.alert('Image Analysis', `Detected: ${topLabels.join(', ')}`);
            } catch (mlError) {
                console.error('ML Kit error:', mlError);
            }

            // Upload to Firebase Storage
            const filename = `profile-pictures/${user?.uid}.jpg`;
            const ref = storage().ref(filename);
            await ref.putFile(uri);
            const downloadURL = await ref.getDownloadURL();

            // Update Firestore
            await firestore().collection('users').doc(user?.uid).update({ photoURL: downloadURL });

            Alert.alert('Success', 'Profile picture updated!');
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const sanitizeUsername = (input: string) => {
        return input.toLowerCase().replace(/[^a-z0-9_]/g, '');
    };

    const handleUsernameChange = (text: string) => {
        const sanitized = sanitizeUsername(text);
        setNewUsername(sanitized);
    };

    const checkUsernameAvailability = async () => {
        if (newUsername.length < 3) {
            Alert.alert('Username too short', 'Username must be at least 3 characters long');
            return false;
        }

        if (newUsername === userDoc?.username) {
            Alert.alert('Same username', 'This is your current username');
            return false;
        }

        setIsCheckingUsername(true);
        try {
            const snapshot = await firestore()
                .collection('users')
                .where('username', '==', newUsername)
                .get();

            if (!snapshot.empty) {
                Alert.alert('Username taken', 'This username is already in use. Please choose another.');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error checking username:', error);
            Alert.alert('Error', 'Failed to check username availability');
            return false;
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const handleUpdateUsername = async () => {
        const { canChange, daysRemaining } = canChangeUsername();

        if (!canChange) {
            Alert.alert(
                'Cannot change username',
                `You can only change your username once every 7 days. Please wait ${daysRemaining} more day(s).`
            );
            return;
        }

        const isAvailable = await checkUsernameAvailability();
        if (!isAvailable) return;

        setIsUpdatingUsername(true);
        try {
            await updateUsername(newUsername);
            Alert.alert('Success', 'Username updated successfully!');
            setShowUsernameModal(false);
            setNewUsername('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update username');
        } finally {
            setIsUpdatingUsername(false);
        }
    };

    const openUsernameModal = () => {
        setNewUsername(userDoc?.username || '');
        setShowUsernameModal(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View className="flex-1 items-center px-6 pt-12">
                    <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
                        {userDoc?.photoURL ? (
                            <Image source={{ uri: userDoc.photoURL }} className="w-32 h-32 rounded-full mb-6" />
                        ) : (
                            <View className="w-32 h-32 rounded-full bg-[#F97316] items-center justify-center mb-6">
                                <Text className="text-white text-5xl font-bold">
                                    {userDoc?.displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {uploading && <ActivityIndicator className="absolute" color="#F97316" />}
                    </TouchableOpacity>

                    <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {userDoc?.displayName}
                    </Text>

                    <TouchableOpacity
                        onPress={openUsernameModal}
                        className="flex-row items-center mb-2"
                    >
                        <Text className="text-lg text-[#F97316] font-semibold">
                            @{userDoc?.username}
                        </Text>
                        <Text className="text-[#F97316] ml-2">✏️</Text>
                    </TouchableOpacity>

                    <Text className="text-gray-600 dark:text-gray-400 mb-2">{userDoc?.email}</Text>

                    {userDoc?.usernameLastChanged && (
                        <Text className="text-xs text-gray-500 dark:text-gray-500 mb-8">
                            {(() => {
                                const { canChange, daysRemaining } = canChangeUsername();
                                if (canChange) {
                                    return 'You can change your username';
                                }
                                return `Can change username in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                            })()}
                        </Text>
                    )}

                    {labels.length > 0 && (
                        <View className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Image Labels (ML Kit):
                            </Text>
                            <Text className="text-sm text-gray-600 dark:text-gray-400">
                                {labels.join(', ')}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handlePickImage}
                        className="bg-[#F97316] px-8 py-4 rounded-lg mb-4 w-full"
                        disabled={uploading}
                    >
                        <Text className="text-white font-semibold text-center text-lg">
                            {uploading ? 'Uploading...' : 'Change Profile Picture'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="border border-red-500 px-8 py-4 rounded-lg w-full"
                    >
                        <Text className="text-red-500 font-semibold text-center text-lg">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Username Change Modal */}
            <Modal
                visible={showUsernameModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUsernameModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#000000' }}>
                            Change Username
                        </Text>

                        {(() => {
                            const { canChange, daysRemaining } = canChangeUsername();
                            if (!canChange) {
                                return (
                                    <View style={{
                                        backgroundColor: '#FEF3C7',
                                        padding: 12,
                                        borderRadius: 8,
                                        marginBottom: 16,
                                        borderWidth: 1,
                                        borderColor: '#FDE68A'
                                    }}>
                                        <Text style={{ color: '#92400E', fontSize: 14 }}>
                                            ⚠️ You can only change your username once every 7 days. Please wait {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''}.
                                        </Text>
                                    </View>
                                );
                            }
                            return null;
                        })()}

                        <Text style={{ fontSize: 14, color: '#666666', marginBottom: 16 }}>
                            You can change your username once every 7 days. Choose carefully!
                        </Text>

                        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000000' }}>
                            New Username
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
                                value={newUsername}
                                onChangeText={handleUsernameChange}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={20}
                            />
                        </View>

                        <Text style={{ fontSize: 12, color: '#666666', marginBottom: 16 }}>
                            Only lowercase letters, numbers, and underscores. Min 3 characters.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#E5E7EB',
                                    padding: 16,
                                    borderRadius: 8,
                                    alignItems: 'center'
                                }}
                                onPress={() => {
                                    setShowUsernameModal(false);
                                    setNewUsername('');
                                }}
                            >
                                <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#F97316',
                                    padding: 16,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    opacity: isCheckingUsername || isUpdatingUsername || !canChangeUsername().canChange ? 0.5 : 1
                                }}
                                onPress={handleUpdateUsername}
                                disabled={isCheckingUsername || isUpdatingUsername || !canChangeUsername().canChange}
                            >
                                {isUpdatingUsername || isCheckingUsername ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                                        Update
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
