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
import { Account, Loan } from '../../types';
import api from '../../services/api';

interface AddLoanScreenProps {
  navigation?: any;
  route?: { params?: { loan?: Loan } };
}

export const AddLoanScreen: React.FC<AddLoanScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  
  const editingLoan = route?.params?.loan;
  const isEditing = !!editingLoan;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(editingLoan?.accountId || null);
  const [formData, setFormData] = useState({
    borrowerName: editingLoan?.borrower || editingLoan?.personName || '',
    amount: editingLoan?.amount ? String(editingLoan.amount) : '',
    interestRate: editingLoan?.interestRate ? String(editingLoan.interestRate) : '',
    dueDate: editingLoan?.dueDate ? formatDateForDisplay(editingLoan.dueDate) : '',
    description: editingLoan?.description || editingLoan?.notes || '',
  });
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
    if (!formData.borrowerName.trim()) {
      Alert.alert('Erro', 'Nome do devedor é obrigatório');
      return false;
    }

    if (!formData.amount.trim()) {
      Alert.alert('Erro', 'Valor do empréstimo é obrigatório');
      return false;
    }

    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Valor do empréstimo deve ser maior que zero');
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
        borrower: formData.borrowerName.trim(),
        interestRate,
        dueDate: formData.dueDate.trim() ? formatDateForAPI(formData.dueDate) : undefined,
        description: formData.description.trim() || undefined,
      };

      if (isEditing) {
        await api.put(`/loans/${editingLoan.id}`, payload);
        showSuccess('Empréstimo atualizado com sucesso!');
      } else {
        await api.post('/loans', payload);
        showSuccess('Empréstimo registrado com sucesso!');
      }
      
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao salvar empréstimo:', error);
      const message = error.response?.data?.message || 'Erro ao salvar empréstimo';
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

  const preview = calculatePreview();

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
          {isEditing ? 'Editar Empréstimo' : 'Novo Empréstimo'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card variant="default" padding="lg" style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Dados do Empréstimo</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            💰 Empréstimo = dinheiro que você emprestou a alguém (eles devem a você)
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Nome do Devedor *</Text>
            <Input
              placeholder="Ex: João Silva"
              value={formData.borrowerName}
              onChangeText={(value) => handleInputChange('borrowerName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Valor do Empréstimo *</Text>
            <Input
              placeholder="0,00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Conta de Origem *</Text>
            {loadingAccounts ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando contas...</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountChip,
                      { 
                        backgroundColor: selectedAccountId === account.id ? colors.primary : colors.surfaceSecondary,
                        borderColor: selectedAccountId === account.id ? colors.primary : colors.border,
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
              placeholder="Ex: 5.0"
              value={formData.interestRate}
              onChangeText={(value) => handleInputChange('interestRate', value)}
              keyboardType="numeric"
            />
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Opcional - deixe em branco se não houver juros
            </Text>
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
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Data em que o empréstimo deve ser pago
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Descrição</Text>
            <Input
              placeholder="Ex: Empréstimo para negócio"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        {preview && (
          <Card variant="outlined" padding="lg" style={[styles.previewCard, { borderColor: colors.primary }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Resumo do Empréstimo</Text>
            
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Valor Principal:</Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                {formatCurrency(preview.principal)}
              </Text>
            </View>

            {preview.monthlyInterest > 0 && (
              <>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Juros Mensal:</Text>
                  <Text style={[styles.previewValue, { color: colors.warning }]}>
                    {formatCurrency(preview.monthlyInterest)}
                  </Text>
                </View>

                <View style={[styles.previewRow, styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Total com Juros:</Text>
                  <Text style={[styles.previewValue, styles.totalValue, { color: colors.primary }]}>
                    {formatCurrency(preview.totalWithInterest)}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Devedor:</Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>
                {formData.borrowerName || 'Nome não informado'}
              </Text>
            </View>

            {formData.dueDate && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Vencimento:</Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>
                  {formData.dueDate}
                </Text>
              </View>
            )}
          </Card>
        )}

        <Card variant="default" padding="md" style={[styles.infoCard, { backgroundColor: `${colors.primary}10` }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>Informações Importantes</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
              • O empréstimo será registrado como pendente
            </Text>
            <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
              • Você pode marcar como pago quando receber o pagamento
            </Text>
            <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
              • Os juros são calculados mensalmente se informados
            </Text>
            <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
              • Empréstimos em atraso serão destacados automaticamente
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={{ flex: 1 }}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
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
  accountsScroll: { marginTop: SPACING.xs },
  accountChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginRight: SPACING.sm,
    borderWidth: 1,
    minWidth: 120,
  },
  accountChipText: { fontSize: 14, fontWeight: '500' },
  accountChipBalance: { fontSize: 11, marginTop: 2 },
  previewCard: { marginBottom: SPACING.lg },
  previewTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, paddingTop: SPACING.sm, marginTop: SPACING.sm },
  totalValue: { fontSize: 16, fontWeight: 'bold' },
  infoCard: { marginBottom: SPACING.lg },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoList: { gap: SPACING.sm },
  infoItem: { fontSize: 12, lineHeight: 16 },
  buttonContainer: { flexDirection: 'row', gap: SPACING.md },
});
