import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';

interface RegisterScreenProps {
  navigation?: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { register } = useAuth();
  const { showError, showSuccess } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usePhone, setUsePhone] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Nome é obrigatório';
    }
    
    if (usePhone) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Telefone é obrigatório';
      } else if (!/^9\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Telefone inválido (ex: 923456789)';
      }
    } else {
      if (!formData.email.trim()) {
        newErrors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: usePhone ? undefined : formData.email.trim(),
        phone: usePhone ? formData.phone.replace(/\s/g, '') : undefined,
        password: formData.password,
      });
      showSuccess('Conta criada com sucesso!');
    } catch (error: any) {
      showError(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation?.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: colors.surfaceSecondary }]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              Criar Conta
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Preencha os dados para começar
            </Text>
          </View>

          {/* Form */}
          <Card variant="default" padding="lg" style={styles.formCard}>
            {/* Toggle Email/Phone */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !usePhone && { backgroundColor: colors.primary },
                  usePhone && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => setUsePhone(false)}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={!usePhone ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[
                  styles.toggleText,
                  { color: !usePhone ? '#FFFFFF' : colors.textSecondary }
                ]}>
                  Email
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  usePhone && { backgroundColor: colors.primary },
                  !usePhone && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => setUsePhone(true)}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={usePhone ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[
                  styles.toggleText,
                  { color: usePhone ? '#FFFFFF' : colors.textSecondary }
                ]}>
                  Telefone
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input
                  label="Nome"
                  placeholder="Seu nome"
                  value={formData.firstName}
                  onChangeText={(text) => updateField('firstName', text)}
                  error={errors.firstName}
                  leftIcon="person-outline"
                />
              </View>
              <View style={styles.nameField}>
                <Input
                  label="Sobrenome"
                  placeholder="Seu sobrenome"
                  value={formData.lastName}
                  onChangeText={(text) => updateField('lastName', text)}
                  leftIcon="person-outline"
                />
              </View>
            </View>

            {usePhone ? (
              <Input
                label="Telefone"
                placeholder="923 456 789"
                value={formData.phone}
                onChangeText={(text) => updateField('phone', text)}
                keyboardType="phone-pad"
                error={errors.phone}
                leftIcon="call-outline"
              />
            ) : (
              <Input
                label="Email"
                placeholder="seu@email.com"
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon="mail-outline"
              />
            )}

            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              secureTextEntry
              error={errors.password}
              leftIcon="lock-closed-outline"
            />

            <Input
              label="Confirmar Senha"
              placeholder="Repita a senha"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon="lock-closed-outline"
            />

            <Button
              title="Criar Conta"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
              icon="person-add-outline"
              style={{ marginTop: SPACING.md }}
            />
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation?.goBack()}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  toggleText: {
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
