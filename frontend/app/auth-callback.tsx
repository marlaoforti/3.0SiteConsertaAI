import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL fragment or params
        let sessionId = null;
        
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          if (hash.includes('session_id=')) {
            sessionId = hash.split('session_id=')[1].split('&')[0];
          }
        }
        
        if (!sessionId && params.session_id) {
          sessionId = params.session_id as string;
        }

        if (!sessionId) {
          console.error('No session_id found');
          router.replace('/');
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session`,
          {},
          {
            headers: {
              'X-Session-ID': sessionId
            },
            withCredentials: true
          }
        );

        const userData = response.data;
        
        // Navigate to main app
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Auth error:', error);
        router.replace('/');
      }
    };

    processAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.text}>Autenticando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
