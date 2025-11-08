import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import functions from '@react-native-firebase/functions';

export default function DashboardScreen() {
  const { user, userDoc } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [tip, setTip] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);

  // Check profile completeness whenever userDoc changes
  useEffect(() => {
    if (userDoc) {
      // Check if all required fields are filled
      const isComplete = !!(
        userDoc.name &&
        userDoc.fitnessGoal &&
        userDoc.dietaryPreference
      );
      setHasCompleteProfile(isComplete);
    } else {
      setHasCompleteProfile(false);
    }
  }, [userDoc]);

  const getDailyTip = async () => {
    setLoading(true);
    setTip('');

    try {
      // Call the Cloud Function
      const result = await functions().httpsCallable('getDailyTipTool')();

      const data = result.data as { tip?: string };
      if (data && data.tip) {
        setTip(data.tip);
      } else {
        Alert.alert('Error', 'No tip received from the server');
      }
    } catch (error: any) {
      console.error('Error getting tip:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to get your daily tip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
            Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            Welcome back, {userDoc?.name || user?.displayName || user?.email?.split('@')[0] || 'User'}!
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
            AI-Powered Daily Tip
          </Text>

          {!hasCompleteProfile ? (
            <>
              <Text style={[styles.cardSubtitle, { color: isDark ? '#aaa' : '#666' }]}>
                Complete your profile to get personalized AI-powered fitness and nutrition advice
              </Text>

              <View
                style={[
                  styles.warningContainer,
                  {
                    backgroundColor: isDark ? '#2c2400' : '#fff3cd',
                    borderColor: isDark ? '#665c00' : '#ffc107',
                  },
                ]}
              >
                <Text style={[styles.warningText, { color: isDark ? '#ffeb3b' : '#856404' }]}>
                  ⚠️ Profile incomplete
                </Text>
                <Text style={[styles.warningSubtext, { color: isDark ? '#ccc' : '#856404' }]}>
                  Please set your fitness goal and dietary preference to unlock AI tips
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#28a745' }]}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.buttonText}>Complete Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.cardSubtitle, { color: isDark ? '#aaa' : '#666' }]}>
                Get personalized fitness and nutrition advice based on your profile
              </Text>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={getDailyTip}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Get My Daily Tip</Text>
                )}
              </TouchableOpacity>

              {tip ? (
                <View
                  style={[
                    styles.tipContainer,
                    {
                      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                      borderColor: isDark ? '#333' : '#ddd',
                    },
                  ]}
                >
                  <Text style={[styles.tipLabel, { color: isDark ? '#aaa' : '#666' }]}>
                    Your Daily Tip
                  </Text>
                  <Text style={[styles.tipText, { color: isDark ? '#fff' : '#000' }]}>
                    {tip}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tipContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoCard: {
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  warningContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
});
