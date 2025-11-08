import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import functions from '@react-native-firebase/functions';

export default function DashboardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tip, setTip] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
          AI-Powered Daily Tip
        </Text>
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
      </View>

      <View style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: isDark ? '#fff' : '#000' }]}>
          How it works
        </Text>
        <View style={styles.infoItem}>
          <Text style={[styles.infoBullet, { color: isDark ? '#007AFF' : '#007AFF' }]}>
            1.
          </Text>
          <Text style={[styles.infoText, { color: isDark ? '#aaa' : '#666' }]}>
            Your request is authenticated using Firebase Auth
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoBullet, { color: isDark ? '#007AFF' : '#007AFF' }]}>
            2.
          </Text>
          <Text style={[styles.infoText, { color: isDark ? '#aaa' : '#666' }]}>
            Cloud Function validates your token and fetches your profile
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoBullet, { color: isDark ? '#007AFF' : '#007AFF' }]}>
            3.
          </Text>
          <Text style={[styles.infoText, { color: isDark ? '#aaa' : '#666' }]}>
            AI generates personalized advice based on your goals
          </Text>
        </View>
      </View>
    </ScrollView>
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
});
