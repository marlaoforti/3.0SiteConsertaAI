import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [repairers, setRepairers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadRepairers();
    }
  }, [userLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
        
        // Update user location in backend
        try {
          await axios.put(
            `${BACKEND_URL}/api/user/location`,
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            { withCredentials: true }
          );
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }
    } catch (error) {
      console.error('Location permission error:', error);
    } finally {
      loadRepairers();
    }
  };

  const loadRepairers = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/repairers`;
      const params = [];
      
      if (userLocation) {
        params.push(`latitude=${userLocation.latitude}`);
        params.push(`longitude=${userLocation.longitude}`);
      }
      
      if (searchQuery) {
        params.push(`skill=${encodeURIComponent(searchQuery)}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await axios.get(url, { withCredentials: true });
      setRepairers(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        console.error('Error loading repairers:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadRepairers();
  };

  const categories = [\n    { name: 'Geladeira', icon: 'snow' },\n    { name: 'Microondas', icon: 'radio' },\n    { name: 'Máquina de Lavar', icon: 'water' },\n    { name: 'TV', icon: 'tv' },\n    { name: 'Ar Condicionado', icon: 'thermometer' },\n    { name: 'Fogão', icon: 'flame' },\n  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por categoria ou aparelho..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((cat, index) => (
          <TouchableOpacity
            key={index}
            style={styles.categoryCard}
            onPress={() => {
              setSearchQuery(cat.name);
              setTimeout(handleSearch, 100);
            }}
          >
            <Ionicons name={cat.icon as any} size={28} color="#10B981" />
            <Text style={styles.categoryText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Repairers List */}
      <ScrollView style={styles.repairersList} contentContainerStyle={styles.repairersContent}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Reparadores Próximos</Text>
          {!userLocation && (
            <TouchableOpacity onPress={requestLocationPermission} style={styles.locationButton}>
              <Ionicons name="location" size={16} color="#F97316" />
              <Text style={styles.locationButtonText}>Ativar localização</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : repairers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum reparador encontrado</Text>
            <Text style={styles.emptySubtext}>Tente ajustar sua busca ou localização</Text>
          </View>
        ) : (
          repairers.map((repairer) => (
            <TouchableOpacity
              key={repairer.repairer_id}
              style={styles.repairerCard}
              onPress={() => router.push(`/repairer/${repairer.repairer_id}`)}
            >
              <View style={styles.repairerHeader}>
                <View style={styles.avatarContainer}>
                  {repairer.picture ? (
                    <img src={repairer.picture} style={styles.avatar as any} />
                  ) : (
                    <Ionicons name="person" size={32} color="#9CA3AF" />
                  )}
                </View>
                <View style={styles.repairerInfo}>
                  <Text style={styles.repairerName}>{repairer.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{repairer.rating.toFixed(1)}</Text>
                    <Text style={styles.repairsCount}>({repairer.total_repairs} consertos)</Text>
                  </View>
                  {repairer.distance_km && repairer.distance_km < 999 && (
                    <View style={styles.distanceContainer}>
                      <Ionicons name="location" size={14} color="#10B981" />
                      <Text style={styles.distanceText}>{repairer.distance_km} km de distância</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.skillsContainer}>
                {repairer.skills.slice(0, 3).map((skill: string, idx: number) => (
                  <View key={idx} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
                {repairer.skills.length > 3 && (
                  <View style={styles.skillTag}>
                    <Text style={styles.skillTagText}>+{repairer.skills.length - 3}</Text>
                  </View>
                )}
              </View>
              {repairer.hourly_rate && (
                <Text style={styles.rateText}>R$ {repairer.hourly_rate}/hora</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-request')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    minWidth: 80,
  },
  categoryText: {
    marginTop: 8,
    fontSize: 12,
    color: '#064E3B',
    textAlign: 'center',
  },
  repairersList: {
    flex: 1,
  },
  repairersContent: {
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationButtonText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  repairerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  repairerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  repairerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  repairerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  repairsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  skillTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillTagText: {
    fontSize: 12,
    color: '#064E3B',
    fontWeight: '600',
  },
  rateText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
