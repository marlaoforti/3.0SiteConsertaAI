import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/repair-requests`;
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      const response = await axios.get(url, { withCredentials: true });
      setRequests(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        console.error('Error loading requests:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Abertos' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'completed', label: 'Concluídos' },
  ];

  return (
    <View style={styles.container}>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterButton,
              filter === f.value && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === f.value && styles.filterButtonTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Requests List */}
      <ScrollView style={styles.requestsList} contentContainerStyle={styles.requestsContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma solicitação encontrada</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/create-request')}
            >
              <Text style={styles.createButtonText}>Criar Solicitação</Text>
            </TouchableOpacity>
          </View>
        ) : (
          requests.map((request) => (
            <TouchableOpacity
              key={request.request_id}
              style={styles.requestCard}
              onPress={() => router.push(`/request/${request.request_id}`)}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestTitle}>
                  <Text style={styles.requestTitleText} numberOfLines={1}>
                    {request.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.requestDescription} numberOfLines={2}>
                {request.description}
              </Text>

              <View style={styles.requestMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="pricetag" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{request.category}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>
                    {format(new Date(request.created_at), 'dd MMM yyyy', { locale: ptBR })}
                  </Text>
                </View>
              </View>

              {request.images && request.images.length > 0 && (
                <View style={styles.imageIndicator}>
                  <Ionicons name="images" size={16} color="#10B981" />
                  <Text style={styles.imageIndicatorText}>{request.images.length} foto(s)</Text>
                </View>
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
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  requestsList: {
    flex: 1,
  },
  requestsContent: {
    padding: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    marginBottom: 8,
  },
  requestTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  imageIndicatorText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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