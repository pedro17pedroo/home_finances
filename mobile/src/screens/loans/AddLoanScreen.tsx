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

interface AddLoanScreenProps {
  navigation: any;
}

export const AddLoanScreen: React.FC<AddLoanScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    borrowerName: '',
    amount: '',
    interestRate: '',
    dueDate: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useCurrency();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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

    if (!formData.dueDate.trim()) {
      Alert.alert('Erro', 'Data de vencimento é obrigatória');
      return false;
    }

    // Validar formato da data (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.dueDate)) {
      Alert.alert('Erro', 'Data deve estar no formato DD/MM/YYYY');
      return false;
    }

    // Validar se a data é futura
    const [day, month, year] = formData.dueDate.split('/').map(Number);
    const dueDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      Alert.alert('Erro', 'Data de vencimento deve ser futura');
      return false;
    }

    // Validar taxa de juros se fornecida
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
      // Simular criação do empréstimo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Sucesso',
        'Empréstimo registrado com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao registrar empréstimo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmountInput = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/[^\d]/g, '');
    
    if (!numbers) return '';
    
    // Converte para número e formata
    const amount = parseInt(numbers) / 100;
    return formatCurrency(amount).replace('AOA', '').trim();
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatAmountInput(value);
    handleInputChange('amount', formatted);
  };

  const formatDateInput = (value: string) => {
    // Remove tudo exceto números
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

    return {
      principal: amount,
      monthlyInterest,
      totalWithInterest,
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
        <Text style={styles.title}>Novo Empréstimo</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Dados do Empréstimo</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome do Devedor *</Text>
            <Input
              placeholder="Ex: João Silva"
              value={formData.borrowerName}
              onChangeText={(value) => handleInputChange('borrowerName', value)}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Valor do Empréstimo *</Text>
            <Input
              placeholder="0,00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.inputHint}>
              Digite o valor sem símbolos de moeda
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Taxa de Juros (% ao mês)</Text>
            <Input
              placeholder="Ex: 5.0"
              value={formData.interestRate}
              onChangeText={(value) => handleInputChange('interestRate', value)}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.inputHint}>
              Opcional - deixe em branco se não houver juros
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Vencimento *</Text>
            <Input
              placeholder="DD/MM/YYYY"
              value={formData.dueDate}
              onChangeText={handleDateChange}
              keyboardType="numeric"
              maxLength={10}
              style={styles.input}
            />
            <Text style={styles.inputHint}>
              Data em que o empréstimo deve ser pago
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrição</Text>
            <Input
              placeholder="Ex: Empréstimo para negócio"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </View>
        </Card>

        {/* Preview do Empréstimo */}
        {preview && (
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumo do Empréstimo</Text>
            
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Valor Principal:</Text>
              <Text style={styles.previewValue}>
                {formatCurrency(preview.principal)}
              </Text>
            </View>

            {preview.monthlyInterest > 0 && (
              <>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Juros Mensal:</Text>
                  <Text style={[styles.previewValue, styles.interestValue]}>
                    {formatCurrency(preview.monthlyInterest)}
                  </Text>
                </View>

                <View style={[styles.previewRow, styles.totalRow]}>
                  <Text style={styles.previewLabel}>Total com Juros:</Text>
                  <Text style={[styles.previewValue, styles.totalValue]}>
                    {formatCurrency(preview.totalWithInterest)}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Devedor:</Text>
              <Text style={styles.previewValue}>
                {formData.borrowerName || 'Nome não informado'}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Vencimento:</Text>
              <Text style={styles.previewValue}>
                {formData.dueDate || 'Data não informada'}
              </Text>
            </View>
          </Card>
        )}

        {/* Informações Importantes */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoTitle}>Informações Importantes</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • O empréstimo será registrado como pendente
            </Text>
            <Text style={styles.infoItem}>
              • Você pode marcar como pago quando receber o pagamento
            </Text>
            <Text style={styles.infoItem}>
              • Os juros são calculados mensalmente se informados
            </Text>
            <Text style={styles.infoItem}>
              • Empréstimos em atraso serão destacados automaticamente
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={loading ? "Registrando..." : "Registrar Empréstimo"}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
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
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  interestValue: {
    color: COLORS.warning,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
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
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});