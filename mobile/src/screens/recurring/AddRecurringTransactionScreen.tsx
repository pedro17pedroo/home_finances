import React, { useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useCurrency } from '../../hooks/useCurrency';
import { COLORS, SPACING } from '../../constants/config';

interface AddRecurringTransactionScreenProps {
  navigation: any;
}

export const AddRecurringTransactionScreen: React.FC<AddRecurringTransactionScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    type: 'despesa' as 'receita' | 'despesa',
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useCurrency();

  // Mock data para categorias e contas
  const categories = [
    { id: 1, name: 'Salário', type: 'receita' },
    { id: 2, name: 'Freelance', type: 'receita' },
    { id: 3, name: 'Investimentos', type: 'receita' },
    { id: 4, name: 'Moradia', type: 'despesa' },
    { id: 5, name: 'Alimentação', type: 'despesa' },
    { id: 6, name: 'Transporte', type: 'despesa' },
    { id: 7, name: 'Saúde', type: 'despesa' },
    { id: 8, name: 'Educação', type: 'despesa' },
    { id: 9, name: 'Lazer', type: 'despesa' },
    { id: 10, name: 'Utilidades', type: 'despesa' },
  ];

  const accounts = [
    { id: 1, name: 'Conta Corrente BAI', type: 'corrente' },
    { id: 2, name: 'Conta Poupança BFA', type: 'poupanca' },
    { id: 3, name: 'Conta Salário BIC', type: 'salario' },
  ];

  const frequencies = [
    { value: 'daily', label: 'Diário', icon: 'today' as keyof typeof Ionicons.glyphMap },
    { value: 'weekly', label: 'Semanal', icon: 'calendar' as keyof typeof Ionicons.glyphMap },
    { value: 'monthly', label: 'Mensal', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap },
    { value: 'yearly', label: 'Anual', icon: 'calendar-clear' as keyof typeof Ionicons.glyphMap },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.description.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return false;
    }

    if (!formData.amount.trim()) {
      Alert.alert('Erro', 'Valor é obrigatório');
      return false;
    }

    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Valor deve ser maior que zero');
      return false;
    }

    if (!formData.categoryId) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return false;
    }

    if (!formData.accountId) {
      Alert.alert('Erro', 'Conta é obrigatória');
      return false;
    }

    if (!formData.startDate.trim()) {
      Alert.alert('Erro', 'Data de início é obrigatória');
      return false;
    }

    // Validar formato da data (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.startDate)) {
      Alert.alert('Erro', 'Data deve estar no formato DD/MM/YYYY');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Simular criação da transação recorrente
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Sucesso',
        'Transação recorrente criada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar transação recorrente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmountInput = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers) / 100;
    return formatCurrency(amount).replace('AOA', '').trim();
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

  const handleDateChange = (field: string, value: string) => {
    const formatted = formatDateInput(value);
    handleInputChange(field, formatted);
  };

  const getFilteredCategories = () => {
    return categories.filter(cat => cat.type === formData.type);
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id.toString() === formData.categoryId);
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id.toString() === formData.accountId);
  };

  const calculatePreview = () => {
    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return null;

    let monthlyAmount = 0;
    let yearlyAmount = 0;

    switch (formData.frequency) {
      case 'daily':
        monthlyAmount = amount * 30;
        yearlyAmount = amount * 365;
        break;
      case 'weekly':
        monthlyAmount = amount * 4;
        yearlyAmount = amount * 52;
        break;
      case 'monthly':
        monthlyAmount = amount;
        yearlyAmount = amount * 12;
        break;
      case 'yearly':
        monthlyAmount = amount / 12;
        yearlyAmount = amount;
        break;
    }

    return {
      amount,
      monthlyAmount,
      yearlyAmount,
    };
  };

  const preview = calculatePreview();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Transação Recorrente</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tipo de Transação */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Tipo de Transação</Text>
          
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'receita' && styles.typeButtonActive,
                formData.type === 'receita' && { backgroundColor: `${COLORS.success}20`, borderColor: COLORS.success }
              ]}
              onPress={() => handleInputChange('type', 'receita')}
            >
              <Ionicons 
                name="trending-up" 
                size={24} 
                color={formData.type === 'receita' ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[
                styles.typeText,
                formData.type === 'receita' && { color: COLORS.success }
              ]}>
                Receita
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'despesa' && styles.typeButtonActive,
                formData.type === 'despesa' && { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error }
              ]}
              onPress={() => handleInputChange('type', 'despesa')}
            >
              <Ionicons 
                name="trending-down" 
                size={24} 
                color={formData.type === 'despesa' ? COLORS.error : COLORS.textSecondary} 
              />
              <Text style={[
                styles.typeText,
                formData.type === 'despesa' && { color: COLORS.error }
              ]}>
                Despesa
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Dados Básicos */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Dados Básicos</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrição *</Text>
            <Input
              placeholder="Ex: Salário, Aluguel, Internet"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Valor *</Text>
            <Input
              placeholder="0,00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Digite o valor sem símbolos de moeda
            </Text>
          </View>
        </Card>

        {/* Categoria */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Categoria</Text>
          
          <View style={styles.categoriesGrid}>
            {getFilteredCategories().map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  formData.categoryId === category.id.toString() && styles.categoryButtonActive,
                ]}
                onPress={() => handleInputChange('categoryId', category.id.toString())}
              >
                <Text style={[
                  styles.categoryText,
                  formData.categoryId === category.id.toString() && styles.categoryTextActive,
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Conta */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Conta</Text>
          
          <View style={styles.accountsContainer}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountButton,
                  formData.accountId === account.id.toString() && styles.accountButtonActive,
                ]}
                onPress={() => handleInputChange('accountId', account.id.toString())}
              >
                <Ionicons 
                  name="wallet" 
                  size={20} 
                  color={formData.accountId === account.id.toString() ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.accountText,
                  formData.accountId === account.id.toString() && styles.accountTextActive,
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Frequência */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Frequência</Text>
          
          <View style={styles.frequencyGrid}>
            {frequencies.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyButton,
                  formData.frequency === freq.value && styles.frequencyButtonActive,
                ]}
                onPress={() => handleInputChange('frequency', freq.value)}
              >
                <Ionicons 
                  name={freq.icon} 
                  size={20} 
                  color={formData.frequency === freq.value ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.frequencyText,
                  formData.frequency === freq.value && styles.frequencyTextActive,
                ]}>
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Datas */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Período</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Início *</Text>
            <Input
              placeholder="DD/MM/YYYY"
              value={formData.startDate}
              onChangeText={(value) => handleDateChange('startDate', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Fim (Opcional)</Text>
            <Input
              placeholder="DD/MM/YYYY"
              value={formData.endDate}
              onChangeText={(value) => handleDateChange('endDate', value)}
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Deixe em branco para transação sem fim
            </Text>
          </View>
        </Card>

        {/* Preview */}
        {preview && (
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumo da Transação</Text>
            
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Tipo:</Text>
              <Text style={[
                styles.previewValue,
                { color: formData.type === 'receita' ? COLORS.success : COLORS.error }
              ]}>
                {formData.type === 'receita' ? 'Receita' : 'Despesa'}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Valor por Execução:</Text>
              <Text style={styles.previewValue}>
                {formatCurrency(preview.amount)}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Impacto Mensal:</Text>
              <Text style={[
                styles.previewValue,
                { color: formData.type === 'receita' ? COLORS.success : COLORS.error }
              ]}>
                {formData.type === 'receita' ? '+' : '-'}{formatCurrency(preview.monthlyAmount)}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Impacto Anual:</Text>
              <Text style={[
                styles.previewValue,
                { color: formData.type === 'receita' ? COLORS.success : COLORS.error }
              ]}>
                {formData.type === 'receita' ? '+' : '-'}{formatCurrency(preview.yearlyAmount)}
              </Text>
            </View>

            {getSelectedCategory() && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Categoria:</Text>
                <Text style={styles.previewValue}>
                  {getSelectedCategory()?.name}
                </Text>
              </View>
            )}

            {getSelectedAccount() && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Conta:</Text>
                <Text style={styles.previewValue}>
                  {getSelectedAccount()?.name}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Informações */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Como Funciona</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • A transação será executada automaticamente na frequência escolhida
            </Text>
            <Text style={styles.infoItem}>
              • Você pode pausar ou reativar a qualquer momento
            </Text>
            <Text style={styles.infoItem}>
              • Receberá notificações antes de cada execução
            </Text>
            <Text style={styles.infoItem}>
              • Pode definir uma data de fim ou deixar indefinida
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
          <Button
            title={loading ? "Criando..." : "Criar Transação"}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
  },
  accountsContainer: {
    gap: SPACING.sm,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  accountButtonActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  accountText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  accountTextActive: {
    color: COLORS.primary,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  frequencyButtonActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  frequencyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  frequencyTextActive: {
    color: COLORS.primary,
  },
  previewCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.primary}05`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  infoCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.info}05`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoList: {
    gap: SPACING.sm,
  },
  infoItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
});