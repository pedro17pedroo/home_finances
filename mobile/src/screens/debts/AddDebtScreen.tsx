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

interface AddDebtScreenProps {
  navigation: any;
}

export const AddDebtScreen: React.FC<AddDebtScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    creditorName: '',
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
      // Simular criação da dívida
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Sucesso',
        'Dívida registrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao registrar dívida. Tente novamente.');
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

  const getDaysUntilDue = () => {
    if (!formData.dueDate) return null;
    
    try {
      const [day, month, year] = formData.dueDate.split('/').map(Number);
      const dueDate = new Date(year, month - 1, day);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const preview = calculatePreview();
  const daysUntilDue = getDaysUntilDue();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Dívida</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Dados da Dívida</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome do Credor *</Text>
            <Input
              placeholder="Ex: Banco BAI, Cartão BFA"
              value={formData.creditorName}
              onChangeText={(value) => handleInputChange('creditorName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Valor da Dívida *</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Taxa de Juros (% ao mês)</Text>
            <Input
              placeholder="Ex: 12.0"
              value={formData.interestRate}
              onChangeText={(value) => handleInputChange('interestRate', value)}
              keyboardType="numeric"
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
            />
            <Text style={styles.inputHint}>
              Data em que a dívida deve ser paga
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrição</Text>
            <Input
              placeholder="Ex: Fatura do cartão de crédito"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        {/* Preview da Dívida */}
        {preview && (
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>Resumo da Dívida</Text>
            
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
              <Text style={styles.previewLabel}>Credor:</Text>
              <Text style={styles.previewValue}>
                {formData.creditorName || 'Nome não informado'}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Vencimento:</Text>
              <Text style={styles.previewValue}>
                {formData.dueDate || 'Data não informada'}
                {daysUntilDue !== null && (
                  <Text style={[
                    styles.daysLabel,
                    { color: daysUntilDue <= 7 ? COLORS.error : COLORS.textSecondary }
                  ]}>
                    {' '}({daysUntilDue} dias)
                  </Text>
                )}
              </Text>
            </View>
          </Card>
        )}

        {/* Alerta de Urgência */}
        {daysUntilDue !== null && daysUntilDue <= 7 && (
          <Card style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color={COLORS.error} />
              <Text style={styles.warningTitle}>Atenção!</Text>
            </View>
            <Text style={styles.warningText}>
              Esta dívida vence em {daysUntilDue} dia(s). 
              {daysUntilDue <= 3 && ' É urgente!'}
            </Text>
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
              • A dívida será registrada como pendente
            </Text>
            <Text style={styles.infoItem}>
              • Você pode marcar como paga quando efetuar o pagamento
            </Text>
            <Text style={styles.infoItem}>
              • Os juros são calculados mensalmente se informados
            </Text>
            <Text style={styles.infoItem}>
              • Dívidas em atraso serão destacadas automaticamente
            </Text>
            <Text style={styles.infoItem}>
              • Você receberá alertas próximo ao vencimento
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
            title={loading ? "Registrando..." : "Registrar Dívida"}
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
  previewCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
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
    color: COLORS.error,
  },
  daysLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
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