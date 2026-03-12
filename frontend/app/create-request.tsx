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
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreateRequestScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);

  const categories = [
    'Geladeira',
    'Microondas',
    'Máquina de Lavar',
    'TV',
    'Ar Condicionado',
    'Fogão',
    'Notebook',
    'Smartphone',
    'Outro',
  ];

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const takePicture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Não foi possível obter sua localização.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation({
        type: 'Point',
        coordinates: [location.coords.longitude, location.coords.latitude],
      });
      Alert.alert('Sucesso', 'Localização obtida!');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, descreva o problema.');
      return;
    }

    if (!category) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria.');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${BACKEND_URL}/api/repair-requests`,
        {
          title,
          description,
          category,
          images,
          location,
        },
        { withCredentials: true }
      );

      Alert.alert('Sucesso!', 'Sua solicitação foi criada.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Erro', 'Não foi possível criar a solicitação.');
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
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Geladeira não está gelando"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Categoria *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Descrição do Problema *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descreva detalhadamente o problema..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Fotos (opcional)</Text>
          <View style={styles.imagePickerButtons}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={takePicture}>
              <Ionicons name="camera" size={24} color="#10B981" />
              <Text style={styles.imagePickerButtonText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#10B981" />
              <Text style={styles.imagePickerButtonText}>Galeria</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Localização (opcional)</Text>
          <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
            <Ionicons name="location" size={20} color="#10B981" />
            <Text style={styles.locationButtonText}>
              {location ? 'Localização obtida ✓' : 'Obter minha localização'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Criar Solicitação</Text>
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    minHeight: 120,
    paddingTop: 12,
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  imagePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  imagesContainer: {
    marginTop: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  locationButton: {
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
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  submitButton: {
    backgroundColor: '#F97316',
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
