import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, Button } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface ContactScreenProps {
  navigation?: any;
}

const subjects = [
  { value: 'duvida', label: 'Dúvida Geral' },
  { value: 'problema', label: 'Reportar Problema' },
  { value: 'sugestao', label: 'Sugestão' },
  { value: 'pagamento', label: 'Problema com Pagamento' },
  { value: 'conta', label: 'Problema com Conta' },
  { value: 'outro', label: 'Outro' },
];

export const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await api.post('/public/contact', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subjects.find(s => s.value === subject)?.label || subject,
        message: message.trim(),
      });
      
      showSuccess('Mensagem enviada com sucesso!');
      navigation?.goBack();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao enviar mensagem');
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
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Fale Conosco</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <Card variant="outlined" padding="md" style={[styles.infoCard, { borderColor: colors.primary }]}>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                suporte@financecontrol.ao
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                +244 923 456 789
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Seg-Sex: 8h às 18h
              </Text>
            </View>
          </Card>

          {/* Form */}
          <Card variant="default" padding="lg">
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Envie sua mensagem
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nome *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Telefone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="923 456 789"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Assunto *</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowSubjectPicker(!showSubjectPicker)}
              >
                <Text style={{ color: subject ? colors.text : colors.textTertiary }}>
                  {subjects.find(s => s.value === subject)?.label || 'Selecione o assunto'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showSubjectPicker && (
                <View style={[styles.pickerOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {subjects.map(s => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.pickerOption, subject === s.value && { backgroundColor: colors.primaryLight }]}
                      onPress={() => {
                        setSubject(s.value);
                        setShowSubjectPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, { color: colors.text }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Mensagem *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Descreva sua dúvida ou problema..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <Button
              title="Enviar Mensagem"
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size="lg"
              icon="send"
            />
          </Card>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: SPACING.md },
  infoCard: { marginBottom: SPACING.lg },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoText: { fontSize: 14 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: 14, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  pickerOptions: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: SPACING.md,
  },
  pickerOptionText: { fontSize: 14 },
});
