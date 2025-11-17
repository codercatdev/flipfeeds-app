import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, userDoc, signOut, updateUsername, canChangeUsername } = useAuth();
  const darkMode = useColorScheme() === 'dark' ? '#fff' : '#000';
  const [uploading, setUploading] = useState(false);
  const [labels, _setLabels] = useState<string[]>([]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [gettingToken, setGettingToken] = useState(false);

  const getIdToken = async () => {
    setGettingToken(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'No user is currently signed in');
        return;
      }

      const token = await currentUser.getIdToken(/* forceRefresh */ true);

      // Copy to clipboard
      Clipboard.setString(token);

      Alert.alert(
        'ID Token Retrieved',
        'Your Firebase ID token has been copied to the clipboard!\n\nNote: This token expires after 1 hour.',
        [
          {
            text: 'Show Token',
            onPress: () => {
              Alert.alert('ID Token', token);
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error getting ID token:', error);
      Alert.alert('Error', 'Failed to retrieve ID token');
    } finally {
      setGettingToken(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || !result.assets || !result.assets[0]) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) return;

      setUploading(true);

      // ML Kit Image Labeling Demo
      // try {
      //     const detectedLabels = await ml().cloudImageLabelerProcessImage(uri);
      //     const topLabels = detectedLabels.slice(0, 3).map(label => label.text);
      //     setLabels(topLabels);
      //     Alert.alert('Image Analysis', `Detected: ${topLabels.join(', ')}`);
      // } catch (mlError) {
      //     console.error('ML Kit error:', mlError);
      // }

      // Upload to Firebase Storage
      const storage = getStorage();
      const filename = `profile-pictures/${user?.uid}.jpg`;
      const storageRef = ref(storage, filename);
      await putFile(storageRef, uri);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const db = getFirestore();
      const userRef = doc(db, 'users', user?.uid || '');
      await updateDoc(userRef, { photoURL: downloadURL });

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
      const db = getFirestore();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', newUsername));
      const snapshot = await getDocs(q);

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

          <Text className="text-3xl font-bold text-black dark:text-white mb-2">
            {userDoc?.displayName}
          </Text>

          <TouchableOpacity onPress={openUsernameModal} className="flex-row items-center mb-2">
            <Text className="text-lg text-primary font-semibold">@{userDoc?.username}</Text>
            <Ionicons name="pencil" size={18} color={darkMode} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text className="text-black/60 dark:text-white/60 mb-2">{userDoc?.email}</Text>

          {userDoc?.usernameLastChanged && (
            <Text className="text-xs text-black/50 dark:text-white/50 mb-8">
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
            <View className="mb-8 p-4 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg">
              <Text className="text-sm font-semibold text-black dark:text-white mb-2">
                Image Labels (ML Kit):
              </Text>
              <Text className="text-sm text-black/60 dark:text-white/60">{labels.join(', ')}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handlePickImage}
            className="bg-primary px-8 py-4 rounded-lg mb-4 w-full"
            disabled={uploading}
          >
            <Text className="text-white font-semibold text-center text-lg">
              {uploading ? 'Uploading...' : 'Change Profile Picture'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={getIdToken}
            className="bg-blue-500 px-8 py-4 rounded-lg mb-4 w-full"
            disabled={gettingToken}
          >
            <View className="flex-row items-center justify-center">
              {gettingToken ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="key" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold text-center text-lg">
                    Get Firebase ID Token
                  </Text>
                </>
              )}
            </View>
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
        <View className="flex-1 justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-black rounded-2xl p-6 border border-black/20 dark:border-white/20">
            <Text className="text-2xl font-bold mb-2 text-black dark:text-white">
              Change Username
            </Text>

            {(() => {
              const { canChange, daysRemaining } = canChangeUsername();
              if (!canChange) {
                return (
                  <View className="bg-primary/20 p-3 rounded-lg mb-4 border border-primary flex-row items-center">
                    <Ionicons name="warning" size={20} color="#F97316" style={{ marginRight: 8 }} />
                    <Text className="text-primary text-sm flex-1">
                      You can only change your username once every 7 days. Please wait{' '}
                      {daysRemaining} more day
                      {daysRemaining !== 1 ? 's' : ''}.
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            <Text className="text-sm text-black/60 dark:text-white/60 mb-4">
              You can change your username once every 7 days. Choose carefully!
            </Text>

            <Text className="text-sm font-semibold mb-2 text-black dark:text-white">
              New Username
            </Text>
            <View className="flex-row mb-4 border border-black/20 dark:border-white/20 rounded-lg overflow-hidden">
              <View className="bg-white dark:bg-black px-4 py-3 justify-center">
                <Text className="text-base text-black/60 dark:text-white/60">@</Text>
              </View>
              <TextInput
                className="flex-1 h-12 bg-white dark:bg-black px-4 text-base text-black dark:text-white"
                placeholder="username"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={newUsername}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={canChangeUsername().canChange}
              />
            </View>

            <Text className="text-xs text-black/60 dark:text-white/60 mb-4">
              Only lowercase letters, numbers, and underscores. Min 3 characters.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-white dark:bg-black border border-black/20 dark:border-white/20 p-4 rounded-lg items-center"
                onPress={() => {
                  setShowUsernameModal(false);
                  setNewUsername('');
                }}
              >
                <Text className="text-black dark:text-white text-base font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-primary p-4 rounded-lg items-center"
                style={{
                  opacity:
                    isCheckingUsername || isUpdatingUsername || !canChangeUsername().canChange
                      ? 0.5
                      : 1,
                }}
                onPress={handleUpdateUsername}
                disabled={
                  isCheckingUsername || isUpdatingUsername || !canChangeUsername().canChange
                }
              >
                {isUpdatingUsername || isCheckingUsername ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
