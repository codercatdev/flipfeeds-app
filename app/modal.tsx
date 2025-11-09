import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

export default function AddFriendModal() {
    const router = useRouter();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setLoading(true);
        try {
            const snapshot = await firestore()
                .collection('users')
                .where('displayName', '>=', searchQuery)
                .where('displayName', '<=', searchQuery + '\uf8ff')
                .limit(10)
                .get();

            const results: User[] = snapshot.docs
                .map(doc => doc.data() as User)
                .filter(u => u.uid !== user?.uid);
            
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
            Alert.alert('Error', 'Failed to search users');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (recipientUid: string) => {
        if (!user) return;

        setSendingTo(recipientUid);
        try {
            // Check if friendship already exists
            const existing = await firestore()
                .collection('friendships')
                .where('users', 'array-contains', user.uid)
                .get();

            const alreadyFriends = existing.docs.some(doc => {
                const users = doc.data().users;
                return users.includes(recipientUid);
            });

            if (alreadyFriends) {
                Alert.alert('Already Connected', 'You are already friends or have a pending request with this user');
                return;
            }

            // Create friendship request
            await firestore().collection('friendships').add({
                users: [user.uid, recipientUid],
                status: 'pending',
                requesterId: user.uid,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            Alert.alert('Request Sent!', 'Friend request sent successfully');
            router.back();
        } catch (error) {
            console.error('Error sending friend request:', error);
            Alert.alert('Error', 'Failed to send friend request');
        } finally {
            setSendingTo(null);
        }
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <View className="flex-row items-center flex-1">
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} className="w-12 h-12 rounded-full mr-4" />
                ) : (
                    <View className="w-12 h-12 rounded-full bg-[#F97316] items-center justify-center mr-4">
                        <Text className="text-white text-xl font-bold">
                            {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View>
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.displayName}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{item.email}</Text>
                </View>
            </View>
            <TouchableOpacity
                className="bg-[#F97316] px-4 py-2 rounded-lg"
                onPress={() => handleSendRequest(item.uid)}
                disabled={sendingTo === item.uid}
            >
                {sendingTo === item.uid ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text className="text-white font-semibold">Add</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black">
            <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="close" size={28} color="#F97316" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">Add Friend</Text>
            </View>

            <View className="px-6 py-4">
                <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-2 text-gray-900 dark:text-white"
                        placeholder="Search by display name"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        autoCapitalize="words"
                    />
                    <TouchableOpacity onPress={handleSearch} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#F97316" size="small" />
                        ) : (
                            <Text className="text-[#F97316] font-semibold">Search</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {searchResults.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-4xl mb-4">🔍</Text>
                    <Text className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
                        Find Your Friends
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-center">
                        Search for friends by their display name to send them a friend request
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.uid}
                />
            )}
        </SafeAreaView>
    );
}
