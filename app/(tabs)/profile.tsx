import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@react-native-firebase/storage';
import ml from '@react-native-firebase/ml';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';

export default function ProfileScreen() {
    const { user, userDoc, signOut } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [labels, setLabels] = useState<string[]>([]);

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
                    <Text className="text-gray-600 dark:text-gray-400 mb-8">{userDoc?.email}</Text>
                    
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
        </SafeAreaView>
    );
}
