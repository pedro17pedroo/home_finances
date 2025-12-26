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
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';
import api from '../../services/api';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

type Step = 'method' | 'code' | 'newPassword' | 'success';
type RecoveryMethod = 'email' | 'phone';

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  
  const [step, setStep] = useState<Step>('method');
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setErrors({ email: 'Email é obrigatório' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Email inválido' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validatePhone = (): boolean => {
    if (!phone.trim()) {
      setErrors({ phone: 'Número de telefone é obrigatório' });
      return false;
    }
    // Aceitar formatos: +244XXXXXXXXX, 244XXXXXXXXX, 9XXXXXXXX
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setErrors({ phone: 'Número de telefone inválido' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateCode = (): boolean => {
    if (!code.trim()) {
      setErrors({ code: 'Código é obrigatório' });
      return false;
    }
    if (code.length !== 6) {
      setErrors({ code: 'Código deve ter 6 dígitos' });
      return false;
    }
    setErrors({});
    return true;
  };

  const validatePasswords = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que não é número
    let cleaned = value.replace(/\D/g, '');
    
    // Se começar com 244, formatar como +244 XXX XXX XXX
    if (cleaned.startsWith('244')) {
      cleaned = cleaned.slice(3);
    }
    
    // Limitar a 9 dígitos
    cleaned = cleaned.slice(0, 9);
    
    // Formatar
    if (cleaned.length > 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handleSendCode = async () => {
    if (recoveryMethod === 'email') {
      if (!validateEmail()) return;
    } else {
      if (!validatePhone()) return;
    }

    setLoading(true);
    try {
      if (recoveryMethod === 'email') {
        const response = await api.post('/auth/forgot-password/email', { email: email.trim() });
        if (response.data.success) {
          showSuccess('Código enviado para seu email');
          setStep('code');
        } else {
          showError(response.data.message || 'Erro ao enviar código');
        }
      } else {
        // Formatar telefone para envio
        let phoneToSend = phone.replace(/\D/g, '');
        if (!phoneToSend.startsWith('244')) {
          phoneToSend = '244' + phoneToSend;
        }
        
        const response = await api.post('/auth/forgot-password/sms', { phone: phoneToSend });
        if (response.data.success) {
          showSuccess('Código enviado por SMS');
          setStep('code');
        } else {
          showError(response.data.message || 'Erro ao enviar código');
        }
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) return;

    setLoading(true);
    try {
      if (recoveryMethod === 'email') {
        // Para email, verificar código e obter token
        const response = await api.post('/auth/verify-reset-code', { 
          email: email.trim(), 
          code: code.trim() 
        });
        if (response.data.token) {
          setResetToken(response.data.token);
        }
        setStep('newPassword');
      } else {
        // Para SMS, verificar código
        let phoneToSend = phone.replace(/\D/g, '');
        if (!phoneToSend.startsWith('244')) {
          phoneToSend = '244' + phoneToSend;
        }
        
        const response = await api.post('/auth/forgot-password/verify-code', { 
          phone: phoneToSend, 
          code: code.trim() 
        });
        if (response.data.success && response.data.token) {
          setResetToken(response.data.token);
          setStep('newPassword');
        } else {
          showError(response.data.message || 'Código inválido');
        }
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password/reset', {
        token: resetToken,
        password: newPassword,
      });
      
      if (response.data.success) {
        setStep('success');
      } else {
        showError(response.data.message || 'Erro ao redefinir senha');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodStep = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryBackground }]}>
          <Ionicons name="key-outline" size={48} color={colors.primary} />
        </View>
      </View>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Esqueceu sua senha?
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Escolha como deseja receber o código de recuperação.
      </Text>

      {/* Method Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            recoveryMethod === 'email' && { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            setRecoveryMethod('email');
            setErrors({});
          }}
        >
          <Ionicons 
            name="mail-outline" 
            size={18} 
            color={recoveryMethod === 'email' ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: recoveryMethod === 'email' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            recoveryMethod === 'phone' && { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            setRecoveryMethod('phone');
            setErrors({});
          }}
        >
          <Ionicons 
            name="phone-portrait-outline" 
            size={18} 
            color={recoveryMethod === 'phone' ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: recoveryMethod === 'phone' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Telefone
          </Text>
        </TouchableOpacity>
      </View>

      {recoveryMethod === 'email' ? (
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({});
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
          error={errors.email}
        />
      ) : (
        <Input
          label="Número de Telefone (Angola)"
          placeholder="923 456 789"
          value={phone}
          onChangeText={(text) => {
            setPhone(formatPhoneNumber(text));
            if (errors.phone) setErrors({});
          }}
          keyboardType="phone-pad"
          leftIcon="phone-portrait-outline"
          error={errors.phone}
          hint="Formato: 9XX XXX XXX"
        />
      )}

      <Button
        title="Enviar Código"
        onPress={handleSendCode}
        loading={loading}
        fullWidth
        size="lg"
        icon="send-outline"
        style={{ marginTop: SPACING.md }}
      />
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryBackground }]}>
          <Ionicons name="keypad-outline" size={48} color={colors.primary} />
        </View>
      </View>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Digite o código
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Enviamos um código de 6 dígitos para {recoveryMethod === 'email' ? email : `+244 ${phone}`}
      </Text>

      <Input
        label="Código de Verificação"
        placeholder="000000"
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, '').slice(0, 6));
          if (errors.code) setErrors({});
        }}
        keyboardType="number-pad"
        leftIcon="keypad-outline"
        error={errors.code}
      />

      <Button
        title="Verificar Código"
        onPress={handleVerifyCode}
        loading={loading}
        fullWidth
        size="lg"
        icon="checkmark-outline"
        style={{ marginTop: SPACING.md }}
      />

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleSendCode}
        disabled={loading}
      >
        <Text style={[styles.resendText, { color: colors.primary }]}>
          Reenviar código
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryBackground }]}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
        </View>
      </View>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Nova Senha
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Crie uma nova senha segura para sua conta.
      </Text>

      <Input
        label="Nova Senha"
        placeholder="Mínimo 6 caracteres"
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
        }}
        secureTextEntry
        leftIcon="lock-closed-outline"
        error={errors.newPassword}
      />

      <Input
        label="Confirmar Senha"
        placeholder="Repita a nova senha"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
        }}
        secureTextEntry
        leftIcon="lock-closed-outline"
        error={errors.confirmPassword}
      />

      <Button
        title="Redefinir Senha"
        onPress={handleResetPassword}
        loading={loading}
        fullWidth
        size="lg"
        icon="checkmark-circle-outline"
        style={{ marginTop: SPACING.md }}
      />
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.successBackground }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
      </View>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Senha Redefinida!
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
      </Text>

      <Button
        title="Ir para Login"
        onPress={() => navigation?.navigate('Login')}
        fullWidth
        size="lg"
        icon="log-in-outline"
        style={{ marginTop: SPACING.lg }}
      />
    </>
  );

  const getStepContent = () => {
    switch (step) {
      case 'method':
        return renderMethodStep();
      case 'code':
        return renderCodeStep();
      case 'newPassword':
        return renderNewPasswordStep();
      case 'success':
        return renderSuccessStep();
    }
  };

  const getProgress = () => {
    switch (step) {
      case 'method': return 1;
      case 'code': return 2;
      case 'newPassword': return 3;
      case 'success': return 4;
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
            {step !== 'success' && (
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  if (step === 'method') {
                    navigation?.goBack();
                  } else if (step === 'code') {
                    setStep('method');
                    setCode('');
                  } else if (step === 'newPassword') {
                    setStep('code');
                  }
                }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Indicator */}
          {step !== 'success' && (
            <View style={styles.progressContainer}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: i <= getProgress() ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Content */}
          <Card variant="default" padding="lg" style={styles.card}>
            {getStepContent()}
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    minHeight: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
