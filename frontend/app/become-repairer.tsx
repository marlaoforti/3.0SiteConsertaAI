import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';\nimport axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function BecomeRepairerScreen() {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (skills.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos uma habilidade.');
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${BACKEND_URL}/api/repairer/profile`,
        {
          skills,
          bio,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          photos,
        },
        { withCredentials: true }
      );

      Alert.alert('Sucesso!', 'Você agora é um reparador!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/profile'),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating repairer profile:', error);
      if (error.response?.data?.detail) {
        Alert.alert('Erro', error.response.data.detail);
      } else {
        Alert.alert('Erro', 'Não foi possível criar o perfil de reparador.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name=\"construct\" size={48} color=\"#10B981\" />
          <Text style={styles.headerTitle}>Torne-se um Reparador</Text>
          <Text style={styles.headerSubtitle}>
            Compartilhe suas habilidades e ganhe renda extra ajudando a comunidade.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Habilidades *</Text>
          <View style={styles.skillInputContainer}>
            <TextInput
              style={styles.skillInput}
              placeholder=\"Ex: Geladeira, Microondas...\"
              value={skillInput}
              onChangeText={setSkillInput}
              onSubmitEditing={addSkill}
              returnKeyType=\"done\"
            />
            <TouchableOpacity style={styles.addButton} onPress={addSkill}>
              <Ionicons name=\"add\" size={24} color=\"#FFFFFF\" />
            </TouchableOpacity>
          </View>

          {skills.length > 0 && (
            <View style={styles.skillsList}>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)}>
                    <Ionicons name=\"close-circle\" size={20} color=\"#10B981\" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Sobre Você</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder=\"Conte um pouco sobre sua experiência...\"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical=\"top\"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Valor por Hora (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder=\"Ex: 50.00\"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType=\"decimal-pad\"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Fotos (opcional)</Text>
          <Text style={styles.helperText}>
            Adicione fotos suas trabalhando ou de ferramentas
          </Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Ionicons name=\"images\" size={24} color=\"#10B981\" />
            <Text style={styles.photoButtonText}>Adicionar Fotos</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name=\"close-circle\" size={24} color=\"#EF4444\" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size=\"small\" color=\"#FFFFFF\" />
          ) : (
            <Text style={styles.submitButtonText}>Criar Perfil de Reparador</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#064E3B',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  skillTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#064E3B',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  photosContainer: {
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
