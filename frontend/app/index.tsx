import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function WelcomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/impact-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = `${BACKEND_URL}/auth-callback`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    // For Expo, we'll handle this in the app navigation
    router.push('/auth-callback');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1721332154191-ba5f1534266e' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Não jogue fora,{"\n"}dê uma nova vida.</Text>
          <Text style={styles.heroSubtitle}>
            Conectamos você a especialistas locais para consertar seus eletrodomésticos de forma rápida, barata e sustentável.
          </Text>
        </View>
      </View>

      {/* Impact Counter */}
      {loading ? (
        <View style={styles.statsContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : stats ? (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Nosso Impacto</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="leaf" size={32} color="#10B981" />
              <Text style={styles.statNumber}>{stats.total_waste_kg.toFixed(0)}</Text>
              <Text style={styles.statLabel}>kg de lixo evitados</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash" size={32} color="#10B981" />
              <Text style={styles.statNumber}>R$ {stats.total_money_saved.toFixed(0)}</Text>
              <Text style={styles.statLabel}>economizados</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cloud-done" size={32} color="#10B981" />
              <Text style={styles.statNumber}>{stats.total_co2_saved.toFixed(0)}</Text>
              <Text style={styles.statLabel}>kg de CO₂ salvos</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="build" size={32} color="#10B981" />
              <Text style={styles.statNumber}>{stats.total_repairs}</Text>
              <Text style={styles.statLabel}>consertos realizados</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* How it Works */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>Como Funciona</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Descreva o problema do seu aparelho</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Encontre um reparador verificado por perto</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Use o chat para combinar o serviço</Text>
          </View>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionCards}>
        <TouchableOpacity style={[styles.actionCard, styles.customerCard]} onPress={handleLogin}>
          <Ionicons name="hammer" size={48} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Preciso de um conserto</Text>
          <Text style={styles.actionCardSubtitle}>Encontre um especialista local</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, styles.repairerCard]} onPress={handleLogin}>
          <Ionicons name="construct" size={48} color="#FFFFFF" />
          <Text style={styles.actionCardTitle}>Quero ser um reparador</Text>
          <Text style={styles.actionCardSubtitle}>Ganhe renda extra ajudando</Text>
        </TouchableOpacity>
      </View>

      {/* Purpose Section */}
      <View style={styles.purposeSection}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1758599669327-83d310882929' }}
          style={styles.purposeImage}
          resizeMode="cover"
        />
        <View style={styles.purposeContent}>
          <Text style={styles.purposeTitle}>Economia Circular</Text>
          <Text style={styles.purposeText}>
            Cada conserto é um passo contra o consumismo. Apoie técnicos locais e ajude a construir uma comunidade mais sustentável.
          </Text>
        </View>
      </View>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Entrar com Google</Text>
        <Ionicons name="logo-google" size={20} color="#FFFFFF" style={styles.googleIcon} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  hero: {
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    padding: 24,
    backgroundColor: '#F0FDF4',
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#064E3B',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#064E3B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  howItWorks: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  actionCards: {
    padding: 24,
    gap: 16,
  },
  actionCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  customerCard: {
    backgroundColor: '#10B981',
  },
  repairerCard: {
    backgroundColor: '#475569',
  },
  actionCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  purposeSection: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    marginBottom: 24,
  },
  purposeImage: {
    width: '100%',
    height: 200,
  },
  purposeContent: {
    padding: 24,
  },
  purposeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  purposeText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  loginButton: {
    marginHorizontal: 24,
    backgroundColor: '#F97316',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  googleIcon: {
    marginLeft: 8,
  },
});