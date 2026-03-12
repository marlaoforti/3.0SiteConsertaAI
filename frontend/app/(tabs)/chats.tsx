import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChatsScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/conversations`, {
        withCredentials: true,
      });
      setConversations(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        console.error('Error loading conversations:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptySubtext}>
            Comece a conversar com reparadores para começar
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.chatsList} contentContainerStyle={styles.chatsContent}>
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.conversation_id}
              style={styles.chatCard}
              onPress={() => router.push(`/chat/${conv.conversation_id}`)}
            >
              <View style={styles.avatarContainer}>
                {conv.other_user?.picture ? (
                  <Image
                    source={{ uri: conv.other_user.picture }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={28} color="#9CA3AF" />
                  </View>
                )}
              </View>

              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName} numberOfLines={1}>
                    {conv.other_user?.name || 'Usuário'}
                  </Text>
                  {conv.last_message_time && (
                    <Text style={styles.chatTime}>
                      {format(new Date(conv.last_message_time), 'HH:mm', { locale: ptBR })}
                    </Text>
                  )}
                </View>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  {conv.last_message || 'Sem mensagens'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
    textAlign: 'center',
  },
  chatsList: {
    flex: 1,
  },
  chatsContent: {
    padding: 0,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  chatMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
});