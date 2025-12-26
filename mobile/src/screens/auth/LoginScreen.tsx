import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';

interface LoginScreenProps {
  navigation?: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { login } = useAuth();
  const { showError } = useToast();
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!emailOrPhone.trim()) {
      newErrors.email = 'Email ou telefone é obrigatório';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login(emailOrPhone.trim(), password);
    } catch (error: any) {
      showError(error.message || 'Credenciais inválidas');
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
          {/* Theme Toggle */}
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

          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="wallet" size={40} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              FinanceControl
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Gerencie suas finanças com facilidade
            </Text>
          </View>

          {/* Login Form */}
          <Card variant="default" padding="lg" style={styles.formCard}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Entrar na sua conta
            </Text>

            <Input
              label="Email ou Telefone"
              placeholder="Digite seu email ou telefone"
              value={emailOrPhone}
              onChangeText={(text) => {
                setEmailOrPhone(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="person-outline"
              error={errors.email}
            />

            <Input
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.password}
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation?.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Esqueceu a senha?
              </Text>
            </TouchableOpacity>

            <Button
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              icon="log-in-outline"
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="Criar nova conta"
              onPress={() => navigation?.navigate('Onboarding')}
              variant="outline"
              fullWidth
              size="lg"
              icon="person-add-outline"
            />
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Ao continuar, você concorda com nossos
            </Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  Termos de Uso
                </Text>
              </TouchableOpacity>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}> e </Text>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  Política de Privacidade
                </Text>
              </TouchableOpacity>
            </View>
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
  themeToggle: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: SPACING.lg,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '500',
  },
});
