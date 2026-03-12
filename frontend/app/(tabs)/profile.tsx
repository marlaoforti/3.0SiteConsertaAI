import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [repairerProfile, setRepairerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userResponse = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true,
      });
      setUser(userResponse.data);

      // Try to load repairer profile if user is repairer
      if (userResponse.data.role === 'repairer' || userResponse.data.role === 'both') {
        try {
          const repairerResponse = await axios.get(
            `${BACKEND_URL}/api/repairer/profile`,
            { withCredentials: true }
          );
          setRepairerProfile(repairerResponse.data);
        } catch (error) {
          console.log('No repairer profile found');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        console.error('Error loading profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${BACKEND_URL}/api/auth/logout`,
                {},
                { withCredentials: true }
              );
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const handleBecomeRepairer = () => {
    router.push('/become-repairer');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color="#9CA3AF" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'customer'
              ? 'Cliente'
              : user?.role === 'repairer'
              ? 'Reparador'
              : 'Cliente e Reparador'}
          </Text>
        </View>
      </View>

      {/* Repairer Stats */}
      {repairerProfile && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{repairerProfile.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="build" size={24} color="#10B981" />
            <Text style={styles.statNumber}>{repairerProfile.total_repairs}</Text>
            <Text style={styles.statLabel}>Consertos</Text>
          </View>
        </View>
      )}

      {/* Menu Options */}
      <View style={styles.menu}>
        {user?.role === 'customer' && (
          <TouchableOpacity style={styles.menuItem} onPress={handleBecomeRepairer}>
            <View style={styles.menuItemContent}>
              <Ionicons name="hammer" size={24} color="#10B981" />
              <Text style={styles.menuItemText}>Tornar-se Reparador</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        )}

        {repairerProfile && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/edit-repairer-profile')}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="create" size={24} color="#3B82F6" />
              <Text style={styles.menuItemText}>Editar Perfil de Reparador</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <View style={styles.menuItemContent}>
            <Ionicons name="settings" size={24} color="#6B7280" />
            <Text style={styles.menuItemText}>Configurações</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <View style={styles.menuItemContent}>
            <Ionicons name="help-circle" size={24} color="#6B7280" />
            <Text style={styles.menuItemText}>Ajuda</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <View style={styles.menuItemContent}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
            <Text style={[styles.menuItemText, styles.logoutText]}>Sair</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Criado por Marlon Forti</Text>
        <Text style={styles.footerSubtext}>Com 💚 para um mundo mais sustentável</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  menu: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
});