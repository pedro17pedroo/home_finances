import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card, Avatar } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface EditProfileScreenProps {
  navigation?: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfileImage((user as any).profileImage || null);
    }
  }, [user]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'Nome é obrigatório';
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (phone && !/^9\d{8}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Telefone inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.replace(/\s/g, '') || undefined,
      });
      
      const updatedUser = response.data?.data || response.data?.user || response.data;
      updateUser(updatedUser);
      showSuccess('Perfil atualizado com sucesso!');
      navigation?.goBack();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    Alert.alert(
      'Alterar Foto',
      'Escolha uma opção',
      [
        { 
          text: 'Tirar Foto', 
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Permissão Necessária',
                  'Para tirar fotos, você precisa permitir o acesso à câmera nas configurações do dispositivo.',
                  [{ text: 'OK' }]
                );
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Erro ao abrir câmera:', error);
              showError('Erro ao abrir câmera');
            }
          }
        },
        { 
          text: 'Escolher da Galeria', 
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Permissão Necessária',
                  'Para escolher fotos, você precisa permitir o acesso à galeria nas configurações do dispositivo.',
                  [{ text: 'OK' }]
                );
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Erro ao abrir galeria:', error);
              showError('Erro ao abrir galeria');
            }
          }
        },
        { 
          text: 'Remover Foto', 
          onPress: () => setProfileImage(null), 
          style: 'destructive' 
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Editar Perfil
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImage}
                />
              ) : (
                <Avatar
                  name={`${firstName} ${lastName}`}
                  size="xl"
                />
              )}
              <TouchableOpacity
                style={[styles.changePhotoButton, { backgroundColor: colors.primary }]}
                onPress={handleChangePhoto}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleChangePhoto}>
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>
                Alterar foto
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Card variant="default" padding="lg">
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input
                  label="Nome"
                  placeholder="Seu nome"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                  }}
                  leftIcon="person-outline"
                  error={errors.firstName}
                />
              </View>
              <View style={styles.nameField}>
                <Input
                  label="Sobrenome"
                  placeholder="Seu sobrenome"
                  value={lastName}
                  onChangeText={setLastName}
                  leftIcon="person-outline"
                />
              </View>
            </View>

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Telefone"
              placeholder="923 456 789"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              keyboardType="phone-pad"
              leftIcon="call-outline"
              error={errors.phone}
            />

            <Button
              title="Salvar Alterações"
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              icon="checkmark-circle-outline"
              style={{ marginTop: SPACING.md }}
            />
          </Card>

          {/* Account Info */}
          <Card variant="outlined" padding="md" style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Informações da Conta
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Plano:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.planType?.charAt(0).toUpperCase()}{user?.planType?.slice(1) || 'Básico'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Status:
              </Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>
                {user?.subscriptionStatus === 'active' ? 'Ativo' : 'Teste'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                ID:
              </Text>
              <Text style={[styles.infoValue, { color: colors.textTertiary }]}>
                #{user?.id}
              </Text>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  nameField: {
    flex: 1,
  },
  infoCard: {
    marginTop: SPACING.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
