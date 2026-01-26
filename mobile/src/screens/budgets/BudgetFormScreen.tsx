import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  createBudget,
  updateBudget,
  getBudget,
  TimePeriodType,
  BudgetStatus,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  AlertConfig,
} from '../../services/budget.service';

/**
 * Budget Form Screen
 * 
 * Create/edit budget form with:
 * - Category selection
 * - Amount input
 * - Time period configuration
 * - Custom date range picker
 * - Status toggle
 * - Form validation
 * 
 * Requirements: 1.1, 1.2, 1.3, 7.1
 */
export default function BudgetFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const params = route.params as { mode: 'create' | 'edit'; budgetId?: number } | undefined;
  const mode = params?.mode || 'create';
  const budgetId = params?.budgetId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriodType>(TimePeriodType.MONTHLY);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<BudgetStatus>(BudgetStatus.ACTIVE);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && budgetId) {
      loadBudget();
    }
  }, [mode, budgetId]);

  const loadBudget = async () => {
    if (!budgetId) return;

    setLoading(true);
    try {
      const budget = await getBudget(budgetId);
      setCategoryId(budget.categoryId.toString());
      setAmount(budget.amount.toString());
      setTimePeriod(budget.timePeriod);
      setStatus(budget.status);
      setAlerts(budget.alerts);

      if (budget.customStartDate) {
        setCustomStartDate(new Date(budget.customStartDate));
      }
      if (budget.customEndDate) {
        setCustomEndDate(new Date(budget.customEndDate));
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      showToast('Erro ao carregar orçamento', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!categoryId.trim()) {
      showToast('Selecione uma categoria', 'error');
      return false;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      showToast('Informe um valor válido', 'error');
      return false;
    }

    if (timePeriod === TimePeriodType.CUSTOM) {
      if (!customStartDate || !customEndDate) {
        showToast('Informe as datas de início e fim', 'error');
        return false;
      }
      if (customEndDate <= customStartDate) {
        showToast('A data de fim deve ser posterior à data de início', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const data: CreateBudgetRequest | UpdateBudgetRequest = {
        categoryId,
        amount: parseFloat(amount),
        timePeriod,
        status,
        alerts,
      };

      if (timePeriod === TimePeriodType.CUSTOM) {
        data.customStartDate = customStartDate?.toISOString();
        data.customEndDate = customEndDate?.toISOString();
      }

      if (mode === 'create') {
        await createBudget(data as CreateBudgetRequest);
        showToast('Orçamento criado com sucesso', 'success');
      } else if (budgetId) {
        await updateBudget(budgetId, data);
        showToast('Orçamento atualizado com sucesso', 'success');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      const message = error?.response?.data?.error?.message || 'Erro ao salvar orçamento';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const timePeriodOptions = [
    { value: TimePeriodType.DAILY, label: 'Diário' },
    { value: TimePeriodType.WEEKLY, label: 'Semanal' },
    { value: TimePeriodType.MONTHLY, label: 'Mensal' },
    { value: TimePeriodType.ANNUAL, label: 'Anual' },
    { value: TimePeriodType.CUSTOM, label: 'Personalizado' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Categoria *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={categoryId}
            onChangeText={setCategoryId}
            placeholder="ID da categoria"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Valor do Orçamento *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Time Period */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Período *
          </Text>
          {timePeriodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioOption,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
                timePeriod === option.value && {
                  borderColor: theme.colors.primary,
                  backgroundColor: `${theme.colors.primary}10`,
                },
              ]}
              onPress={() => setTimePeriod(option.value)}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: theme.colors.border },
                  timePeriod === option.value && {
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                {timePeriod === option.value && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.radioLabel,
                  { color: theme.colors.text },
                  timePeriod === option.value && { fontWeight: '600' },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Date Range */}
        {timePeriod === TimePeriodType.CUSTOM && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Período Personalizado *
            </Text>

            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {customStartDate
                  ? customStartDate.toLocaleDateString('pt-BR')
                  : 'Data de início'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {customEndDate
                  ? customEndDate.toLocaleDateString('pt-BR')
                  : 'Data de fim'}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={customStartDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartDatePicker(Platform.OS === 'ios');
                  if (date) setCustomStartDate(date);
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={customEndDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowEndDatePicker(Platform.OS === 'ios');
                  if (date) setCustomEndDate(date);
                }}
              />
            )}
          </View>
        )}

        {/* Status */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Orçamento Ativo
            </Text>
            <Switch
              value={status === BudgetStatus.ACTIVE}
              onValueChange={(value) =>
                setStatus(value ? BudgetStatus.ACTIVE : BudgetStatus.INACTIVE)
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: theme.colors.primary },
            saving && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <LoadingSpinner size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {mode === 'create' ? 'Criar Orçamento' : 'Salvar Alterações'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
