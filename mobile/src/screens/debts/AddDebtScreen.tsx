import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useCurrency } from '../../hooks/useCurrency';
import { SPACING } from '../../constants/config';
import { Account, Debt } from '../../types';
import api from '../../services/api';

interface AddDebtScreenProps {
  navigation?: any;
  route?: { params?: { debt?: Debt } };
}

export const AddDebtScreen: React.FC<AddDebtScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  
  const editingDebt = route?.params?.debt;
  const isEditing = !!editingDebt;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(editingDebt?.accountId || null);
  const [formData, setFormData] = useState({
    creditorName: editingDebt?.creditor || '',
    amount: editingDebt?.amount || editingDebt?.totalAmount ? String(editingDebt?.amount || editingDebt?.totalAmount) : '',
    interestRate: editingDebt?.interestRate ? String(editingDebt.interestRate) : '',
    dueDate: editingDebt?.dueDate ? formatDateForDisplay(editingDebt.dueDate) : '',
    description: editingDebt?.description || editingDebt?.notes || '',
    creditorPhone: (editingDebt as any)?.creditorPhone || '',
    creditorEmail: (editingDebt as any)?.creditorEmail || '',
  });
  const [notificationChannels, setNotificationChannels] = useState<('app' | 'email' | 'sms')[]>(
    (editingDebt as any)?.notificationChannels || ['app']
  );
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data?.data || response.data || [];
      setAccounts(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      showError('Erro ao carregar contas');
    } finally {
      setLoadingAccounts(false);
    }
  };

  function formatDateForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  }

  function formatDateForAPI(dateStr: string): string {
    const [day, month, year] = dateStr.split('/').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.creditorName.trim()) {
      Alert.alert('Erro', 'Nome do credor é obrigatório');
      return false;
    }
    if (!formData.amount.trim()) {
      Alert.alert('Erro', 'Valor da dívida é obrigatório');
      return false;
    }
    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Valor da dívida deve ser maior que zero');
      return false;
    }
    if (!selectedAccountId) {
      Alert.alert('Erro', 'Selecione uma conta');
      return false;
    }
    if (formData.dueDate.trim()) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(formData.dueDate)) {
        Alert.alert('Erro', 'Data deve estar no formato DD/MM/YYYY');
        return false;
      }
    }
    if (formData.interestRate.trim()) {
      const rate = parseFloat(formData.interestRate.replace(',', '.'));
      if (isNaN(rate) || rate < 0 || rate > 100) {
        Alert.alert('Erro', 'Taxa de juros deve estar entre 0% e 100%');
        return false;
      }
    }
    return true;
  };

  const toggleNotificationChannel = (channel: 'app' | 'email' | 'sms') => {
    setNotificationChannels(prev => {
      if (prev.includes(channel)) {
        return prev.filter(c => c !== channel);
      } else {
        return [...prev, channel];
      }
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
      const interestRate = formData.interestRate.trim() 
        ? parseFloat(formData.interestRate.replace(',', '.')) 
        : undefined;
      const payload = {
        accountId: selectedAccountId,
        amount,
        creditor: formData.creditorName.trim(),
        interestRate,
        dueDate: formData.dueDate.trim() ? formatDateForAPI(formData.dueDate) : undefined,
        description: formData.description.trim() || undefined,
        creditorPhone: formData.creditorPhone.trim() || undefined,
        creditorEmail: formData.creditorEmail.trim() || undefined,
        notificationChannels: notificationChannels.length > 0 ? notificationChannels : undefined,
      };
      if (isEditing) {
        await api.put(`/debts/${editingDebt.id}`, payload);
        showSuccess('Dívida atualizada com sucesso!');
      } else {
        await api.post('/debts', payload);
        showSuccess('Dívida registrada com sucesso!');
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar dívida:', error);
      const message = error.response?.data?.message || 'Erro ao salvar dívida';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatAmountInput = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers) / 100;
    return formatCurrency(amount).replace('Kz', '').trim();
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatAmountInput(value);
    handleInputChange('amount', formatted);
  };

  const formatDateInput = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const handleDateChange = (value: string) => {
    const formatted = formatDateInput(value);
    handleInputChange('dueDate', formatted);
  };

  const calculatePreview = () => {
    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;
    if (isNaN(amount) || amount <= 0) return null;
    const monthlyInterest = (amount * rate) / 100;
    const totalWithInterest = amount + monthlyInterest;
    return { principal: amount, monthlyInterest, totalWithInterest };
  };

  const getDaysUntilDue = () => {
    if (!formData.dueDate) return null;
    try {
      const [day, month, year] = formData.dueDate.split('/').map(Number);
      const dueDate = new Date(year, month - 1, day);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const preview = calculatePreview();
  const daysUntilDue = getDaysUntilDue();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isEditing ? 'Editar Dívida' : 'Nova Dívida'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card variant="default" padding="lg" style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Dados da Dívida</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            💳 Dívida = dinheiro que você deve a alguém (você deve a eles)
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Nome do Credor *</Text>
            <Input
              placeholder="Ex: Banco BAI, Cartão BFA"
              value={formData.creditorName}
              onChangeText={(value) => handleInputChange('creditorName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Valor da Dívida *</Text>
            <Input
              placeholder="0,00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Conta Associada *</Text>
            {loadingAccounts ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountChip,
                      { 
                        backgroundColor: selectedAccountId === account.id ? colors.error : colors.surfaceSecondary,
                        borderColor: selectedAccountId === account.id ? colors.error : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedAccountId(account.id)}
                  >
                    <Text style={[
                      styles.accountChipText,
                      { color: selectedAccountId === account.id ? '#FFFFFF' : colors.text }
                    ]}>
                      {account.name}
                    </Text>
                    <Text style={[
                      styles.accountChipBalance,
                      { color: selectedAccountId === account.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                    ]}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Taxa de Juros (% ao mês)</Text>
            <Input
              placeholder="Ex: 12.0"
              value={formData.interestRate}
              onChangeText={(value) => handleInputChange('interestRate', value)}
              keyboardType="numeric"
            />
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>Opcional</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Data de Vencimento</Text>
            <Input
              placeholder="DD/MM/YYYY"
              value={formData.dueDate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Descrição</Text>
            <Input
              placeholder="Ex: Fatura do cartão"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações de Contato (Opcional)</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            📧 Adicione contato para receber lembretes de pagamento
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Telefone do Credor</Text>
            <Input
              placeholder="Ex: +244 923 456 789"
              value={formData.creditorPhone}
              onChangeText={(value) => handleInputChange('creditorPhone', value)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email do Credor</Text>
            <Input
              placeholder="Ex: banco@email.com"
              value={formData.creditorEmail}
              onChangeText={(value) => handleInputChange('creditorEmail', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Canais de Notificação</Text>
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Selecione como deseja receber lembretes
            </Text>
            
            <View style={styles.checkboxGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => toggleNotificationChannel('app')}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  notificationChannels.includes('app') && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}>
                  {notificationChannels.includes('app') && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Ionicons name="notifications" size={20} color={colors.text} style={styles.checkboxIcon} />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Notificações no App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => toggleNotificationChannel('email')}
                disabled={!formData.creditorEmail.trim()}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  notificationChannels.includes('email') && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !formData.creditorEmail.trim() && { opacity: 0.5 }
                ]}>
                  {notificationChannels.includes('email') && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Ionicons name="mail" size={20} color={colors.text} style={styles.checkboxIcon} />
                <Text style={[styles.checkboxLabel, { color: colors.text }, !formData.creditorEmail.trim() && { opacity: 0.5 }]}>
                  Email {!formData.creditorEmail.trim() && '(adicione email acima)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => toggleNotificationChannel('sms')}
                disabled={!formData.creditorPhone.trim()}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  notificationChannels.includes('sms') && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !formData.creditorPhone.trim() && { opacity: 0.5 }
                ]}>
                  {notificationChannels.includes('sms') && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Ionicons name="chatbubble" size={20} color={colors.text} style={styles.checkboxIcon} />
                <Text style={[styles.checkboxLabel, { color: colors.text }, !formData.creditorPhone.trim() && { opacity: 0.5 }]}>
                  SMS {!formData.creditorPhone.trim() && '(adicione telefone acima)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {preview && (
          <Card variant="outlined" padding="lg" style={[styles.previewCard, { borderColor: colors.error }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Resumo</Text>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Principal:</Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>{formatCurrency(preview.principal)}</Text>
            </View>
            {preview.monthlyInterest > 0 && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Juros:</Text>
                  <Text style={[styles.previewValue, { color: colors.warning }]}>{formatCurrency(preview.monthlyInterest)}</Text>
                </View>
                <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Total:</Text>
                  <Text style={[styles.previewValue, { color: colors.error, fontWeight: 'bold' }]}>{formatCurrency(preview.totalWithInterest)}</Text>
                </View>
              </>
            )}
          </Card>
        )}

        {daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0 && (
          <Card variant="outlined" padding="md" style={[styles.warningCard, { borderColor: colors.error, backgroundColor: `${colors.error}10` }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color={colors.error} />
              <Text style={[styles.warningTitle, { color: colors.error }]}>Atenção!</Text>
            </View>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Vence em {daysUntilDue} dia(s){daysUntilDue <= 3 && ' - Urgente!'}
            </Text>
          </Card>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Cancelar" onPress={() => navigation.goBack()} variant="outline" style={{ flex: 1 }} />
          <Button
            title={loading ? "Salvando..." : (isEditing ? "Atualizar" : "Registrar")}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={{ flex: 2 }}
          />
        </View>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  scrollView: { flex: 1, paddingHorizontal: SPACING.md },
  formCard: { marginBottom: SPACING.lg },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: SPACING.xs },
  formSubtitle: { fontSize: 12, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.lg },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: SPACING.sm },
  inputHint: { fontSize: 12, marginTop: SPACING.xs },
  loadingText: { fontSize: 14, padding: SPACING.md },
  accountChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 12, marginRight: SPACING.sm, borderWidth: 1, minWidth: 120 },
  accountChipText: { fontSize: 14, fontWeight: '500' },
  accountChipBalance: { fontSize: 11, marginTop: 2 },
  previewCard: { marginBottom: SPACING.lg },
  previewTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.xs },
  sectionSubtitle: { fontSize: 12, marginBottom: SPACING.lg },
  checkboxGroup: { marginTop: SPACING.sm, gap: SPACING.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIcon: { marginLeft: SPACING.sm, marginRight: SPACING.xs },
  checkboxLabel: { fontSize: 14, flex: 1 },
  warningCard: { marginBottom: SPACING.lg },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  warningTitle: { fontSize: 14, fontWeight: '600' },
  warningText: { fontSize: 12 },
  buttonContainer: { flexDirection: 'row', gap: SPACING.md },
});
