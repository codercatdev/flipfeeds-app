import { Ionicons } from '@expo/vector-icons';
import database from '@react-native-firebase/database';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import perf from '@react-native-firebase/perf';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { createStreakKey, type Friendship, type User } from '@/types';

interface FriendWithStreak extends User {
    streakCount: number;
    friendshipId: string;
}

export default function FriendsScreen() {
    const { user, userDoc } = useAuth();
    const router = useRouter();
    const [friends, setFriends] = useState<FriendWithStreak[]>([]);
    const [loading, setLoading] = useState(true);
    const [flippingUserId, setFlippingUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = firestore()
            .collection('friendships')
            .where('users', 'array-contains', user.uid)
            .where('status', '==', 'accepted')
            .onSnapshot(
                async (snapshot) => {
                    const friendsList: FriendWithStreak[] = [];
                    for (const doc of snapshot.docs) {
                        const friendship = doc.data() as Friendship;
                        const friendUid = friendship.users.find((uid) => uid !== user.uid);
                        if (!friendUid) continue;
                        const friendDoc = await firestore()
                            .collection('users')
                            .doc(friendUid)
                            .get();
                        if (friendDoc.exists()) {
                            const friendData = friendDoc.data() as User;
                            friendsList.push({
                                ...friendData,
                                streakCount: 0,
                                friendshipId: doc.id,
                            });
                        }
                    }
                    setFriends(friendsList);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching friends:', error);
                    setLoading(false);
                }
            );
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user || friends.length === 0) return;
        const unsubscribers: (() => void)[] = [];
        friends.forEach((friend, index) => {
            const streakKey = createStreakKey(user.uid, friend.uid);
            const streakRef = database().ref(`flip_streaks/${streakKey}`);
            const unsubscribe = streakRef.on('value', (snapshot) => {
                const streakData = snapshot.val();
                const streakCount = streakData?.count || 0;
                setFriends((prevFriends) => {
                    const newFriends = [...prevFriends];
                    newFriends[index] = { ...newFriends[index], streakCount };
                    return newFriends;
                });
            });
            unsubscribers.push(() => streakRef.off('value', unsubscribe));
        });
        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [user, friends.length, friends.forEach]);

    const handleFlip = async (friendUid: string, friendName: string) => {
        if (!user) return;
        setFlippingUserId(friendUid);
        try {
            const trace = await perf().startTrace('e2e_flip_trace');
            const sendFlip = functions().httpsCallable('sendFlip');
            const result = await sendFlip({ recipientUid: friendUid });
            await trace.stop();
            console.log('Flip sent successfully:', result.data);
            Alert.alert('Flip Sent! 🎉', `You flipped ${friendName}!`);
        } catch (error: any) {
            console.error('Error sending flip:', error);
            Alert.alert(
                'Flip Failed',
                error.message || 'Could not send the flip. Please try again.'
            );
        } finally {
            setFlippingUserId(null);
        }
    };

    const renderFriendItem = ({ item }: { item: FriendWithStreak }) => (
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
            <View className="flex-row items-center flex-1">
                {item.photoURL ? (
                    <Image
                        source={{ uri: item.photoURL }}
                        className="w-12 h-12 rounded-full mr-4"
                    />
                ) : (
                    <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mr-4">
                        <Text className="text-white text-xl font-bold">
                            {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-black dark:text-white">
                        {item.displayName}
                    </Text>
                    {item.streakCount > 0 && (
                        <View className="flex-row items-center mt-1">
                            <Ionicons
                                name="flame"
                                size={16}
                                color="#F97316"
                                style={{ marginRight: 4 }}
                            />
                            <Text className="text-sm text-black/60 dark:text-white/60">
                                {item.streakCount} flip{item.streakCount !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-lg"
                onPress={() => handleFlip(item.uid, item.displayName)}
                disabled={flippingUserId === item.uid}
            >
                {flippingUserId === item.uid ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-bold text-lg">FLIP</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-black">
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']} style={{ flex: 1 }}>
            <View className="px-6 py-4 border-b border-black/10 dark:border-white/10">
                <View className="flex-row items-center justify-between">
                    <Text className="text-3xl font-bold text-black dark:text-white">Friends</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/modal')}
                        className="bg-primary w-10 h-10 rounded-full items-center justify-center"
                    >
                        <Ionicons name="person-add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                {userDoc && (
                    <View className="flex-row items-center mt-2">
                        <Ionicons
                            name="hand-right"
                            size={20}
                            color="#F97316"
                            style={{ marginRight: 8 }}
                        />
                        <Text className="text-black/60 dark:text-white/60">
                            Hey {userDoc.displayName}!
                        </Text>
                    </View>
                )}
            </View>
            {friends.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Ionicons
                        name="people-outline"
                        size={80}
                        color="#F97316"
                        style={{ marginBottom: 16 }}
                    />
                    <Text className="text-2xl font-bold text-black dark:text-white text-center mb-2">
                        No Friends Yet
                    </Text>
                    <Text className="text-black/60 dark:text-white/60 text-center mb-6">
                        Add friends to start flipping!
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/modal')}
                        className="bg-primary px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold text-lg">Add Friend</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={friends}
                    renderItem={renderFriendItem}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </SafeAreaView>
    );
}
