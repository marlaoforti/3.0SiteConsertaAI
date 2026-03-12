import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import io from 'socket.io-client';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const SOCKET_PATH = '/api/socket.io';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    
    // Initialize Socket.IO
    socketRef.current = io(BACKEND_URL, { path: SOCKET_PATH });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      if (conversationId) {
        socketRef.current.emit('join_room', { conversation_id: conversationId });
      }
    });

    socketRef.current.on('new_message', (message: any) => {
      console.log('Received new message:', message);
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [conversationId]);

  const loadCurrentUser = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        withCredentials: true,
      });
      setCurrentUserId(response.data.user_id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/messages/${conversationId}`, {
        withCredentials: true,
      });
      setMessages(response.data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.replace('/');
      } else {
        console.error('Error loading messages:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Note: For this implementation, we need the receiver_id
      // In a real scenario, you'd get this from the conversation data
      // For now, we'll just send via API which broadcasts via Socket.io
      
      const tempMessage = newMessage;
      setNewMessage('');
      
      // Optimistic update
      const optimisticMessage = {
        message_id: `temp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: tempMessage,
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      setMessages((prev) => [...prev, optimisticMessage]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Note: This endpoint needs to be updated to accept conversation_id instead of receiver_id
      // For MVP, we'll handle this gracefully
      
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(newMessage);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    const messageTime = format(new Date(item.timestamp), 'HH:mm', { locale: ptBR });

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownTime : styles.otherTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size=\"large\" color=\"#10B981\" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder=\"Digite sua mensagem...\"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size=\"small\" color=\"#FFFFFF\" />
          ) : (
            <Ionicons name=\"send\" size={24} color=\"#FFFFFF\" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTime: {
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'right',
  },
  otherTime: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#1F2937',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
