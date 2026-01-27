import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SPACING } from '../../constants/config';
import api from '../../services/api';
import {
  createBudget,
  updateBudget,
  getBudget,
  TimePeriodType,
  BudgetStatus,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  AlertConfig,
  ThresholdType,
  AlertPosition,
  ChannelType,
  AlertChannel,
} from '../../services/budget.service';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon: string;
  color: string;
  isDefault?: boolean;
}

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
  const { colors } = useTheme();
  const { showToast } = useToast();

  const params = route.params as { mode: 'create' | 'edit'; budgetId?: number } | undefined;
  const mode = params?.mode || 'create';
  const budgetId = params?.budgetId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form fields
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriodType>(TimePeriodType.MONTHLY);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [status, setStatus] = useState<BudgetStatus>(BudgetStatus.ACTIVE);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && budgetId) {
      loadBudget();
    }
  }, [mode, budgetId]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      const data = response.data?.data || response.data;
      const categoriesList = Array.isArray(data) ? data : [];
      // Filtrar apenas categorias de despesa para orçamentos
      setCategories(categoriesList.filter((cat: Category) => cat.type === 'despesa'));
    } catch (error) {
      console.error('Error loading categories:', error);
      showToast({ message: 'Erro ao carregar categorias', type: 'error' });
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

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
        setCustomStartDate(budget.customStartDate.split('T')[0]);
      }
      if (budget.customEndDate) {
        setCustomEndDate(budget.customEndDate.split('T')[0]);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      showToast({ message: 'Erro ao carregar orçamento', type: 'error' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const addAlert = () => {
    setAlerts([
      ...alerts,
      {
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: false },
          { type: ChannelType.SMS, enabled: false },
        ],
      },
    ]);
  };

  const removeAlert = (index: number) => {
    Alert.alert(
      'Remover Alerta',
      'Tem certeza que deseja remover este alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => setAlerts(alerts.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  const updateAlert = (index: number, field: keyof AlertConfig, value: any) => {
    const newAlerts = [...alerts];
    newAlerts[index] = { ...newAlerts[index], [field]: value };
    setAlerts(newAlerts);
  };

  const updateAlertChannel = (index: number, channelType: ChannelType, enabled: boolean) => {
    const newAlerts = [...alerts];
    const channels = newAlerts[index].channels.map(ch =>
      ch.type === channelType ? { ...ch, enabled } : ch
    );
    newAlerts[index] = { ...newAlerts[index], channels };
    setAlerts(newAlerts);
  };

  const getChannelEnabled = (alert: AlertConfig, channelType: ChannelType): boolean => {
    const channel = alert.channels.find(ch => ch.type === channelType);
    return channel?.enabled || false;
  };

  const validateForm = (): boolean => {
    if (!categoryId.trim()) {
      showToast({ message: 'Selecione uma categoria', type: 'error' });
      return false;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      showToast({ message: 'Informe um valor válido', type: 'error' });
      return false;
    }

    if (timePeriod === TimePeriodType.CUSTOM) {
      if (!customStartDate || !customEndDate) {
        showToast({ message: 'Informe as datas de início e fim', type: 'error' });
        return false;
      }
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      if (endDate <= startDate) {
        showToast({ message: 'A data de fim deve ser posterior à data de início', type: 'error' });
        return false;
      }
    }

    // Validar alertas
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      
      if (alert.thresholdValue <= 0) {
        showToast({ message: `Alerta #${i + 1}: O limite deve ser maior que zero`, type: 'error' });
        return false;
      }

      if (alert.thresholdType === ThresholdType.PERCENTAGE && alert.thresholdValue > 100) {
        showToast({ message: `Alerta #${i + 1}: O percentual não pode ser maior que 100%`, type: 'error' });
        return false;
      }

      const hasEnabledChannel = alert.channels.some(ch => ch.enabled);
      if (!hasEnabledChannel) {
        showToast({ message: `Alerta #${i + 1}: Selecione pelo menos um canal de notificação`, type: 'error' });
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
        data.customStartDate = customStartDate;
        data.customEndDate = customEndDate;
      }

      if (mode === 'create') {
        await createBudget(data as CreateBudgetRequest);
        showToast({ message: 'Orçamento criado com sucesso', type: 'success' });
      } else if (budgetId) {
        await updateBudget(budgetId, data);
        showToast({ message: 'Orçamento atualizado com sucesso', type: 'success' });
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      const message = error?.response?.data?.error?.message || 'Erro ao salvar orçamento';
      showToast({ message, type: 'error' });
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

  if (loading || loadingCategories) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'create' ? 'Novo Orçamento' : 'Editar Orçamento'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Categoria *
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Selecione a categoria de despesa para controlar o orçamento
          </Text>
          
          {categories.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="folder-open-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma categoria de despesa encontrada
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => (navigation as any).navigate('Categories')}
              >
                <Text style={styles.createButtonText}>Criar Categoria</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: categoryId === category.id.toString() 
                        ? colors.primary 
                        : colors.card,
                      borderColor: categoryId === category.id.toString() 
                        ? colors.primary 
                        : colors.border,
                    }
                  ]}
                  onPress={() => setCategoryId(category.id.toString())}
                >
                  <View style={[
                    styles.categoryIconContainer,
                    { 
                      backgroundColor: categoryId === category.id.toString()
                        ? 'rgba(255,255,255,0.2)'
                        : category.color + '20'
                    }
                  ]}>
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={categoryId === category.id.toString() ? '#FFFFFF' : category.color}
                    />
                  </View>
                  <Text style={[
                    styles.categoryChipText,
                    { color: categoryId === category.id.toString() ? '#FFFFFF' : colors.text }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Valor do Orçamento *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Time Period */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Período *
          </Text>
          {timePeriodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.radioOption,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                timePeriod === option.value && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
              onPress={() => setTimePeriod(option.value)}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: colors.border },
                  timePeriod === option.value && {
                    borderColor: colors.primary,
                  },
                ]}
              >
                {timePeriod === option.value && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.radioLabel,
                  { color: colors.text },
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
            <Text style={[styles.label, { color: colors.text }]}>
              Período Personalizado *
            </Text>

            <View style={styles.dateInputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={customStartDate}
                onChangeText={setCustomStartDate}
                placeholder="Data de início (YYYY-MM-DD)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.dateInputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="Data de fim (YYYY-MM-DD)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        )}

        {/* Status */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.text }]}>
              Orçamento Ativo
            </Text>
            <Switch
              value={status === BudgetStatus.ACTIVE}
              onValueChange={(value) =>
                setStatus(value ? BudgetStatus.ACTIVE : BudgetStatus.INACTIVE)
              }
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
            />
          </View>
        </View>

        {/* Alertas e Notificações */}
        <View style={styles.section}>
          <View style={styles.alertsHeader}>
            <View>
              <Text style={[styles.label, { color: colors.text }]}>
                Alertas e Notificações
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Configure quando e como deseja ser notificado
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addAlertButton, { backgroundColor: colors.primary }]}
              onPress={addAlert}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {alerts.length === 0 ? (
            <View style={[styles.emptyAlerts, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyAlertsText, { color: colors.textSecondary }]}>
                Nenhum alerta configurado
              </Text>
              <Text style={[styles.emptyAlertsHint, { color: colors.textSecondary }]}>
                Toque no botão + para adicionar alertas
              </Text>
            </View>
          ) : (
            alerts.map((alert, index) => (
              <View
                key={index}
                style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.alertCardHeader}>
                  <Text style={[styles.alertCardTitle, { color: colors.text }]}>
                    Alerta #{index + 1}
                  </Text>
                  <TouchableOpacity
                    style={[styles.removeAlertButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => removeAlert(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Limite */}
                <View style={styles.alertField}>
                  <Text style={[styles.alertFieldLabel, { color: colors.text }]}>
                    Limite
                  </Text>
                  <TextInput
                    style={[
                      styles.alertInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={alert.thresholdValue.toString()}
                    onChangeText={(value) => updateAlert(index, 'thresholdValue', parseFloat(value) || 0)}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Tipo */}
                <View style={styles.alertField}>
                  <Text style={[styles.alertFieldLabel, { color: colors.text }]}>
                    Tipo
                  </Text>
                  <View style={styles.alertTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.alertTypeButton,
                        { borderColor: colors.border },
                        alert.thresholdType === ThresholdType.PERCENTAGE && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => updateAlert(index, 'thresholdType', ThresholdType.PERCENTAGE)}
                    >
                      <Text
                        style={[
                          styles.alertTypeButtonText,
                          { color: colors.text },
                          alert.thresholdType === ThresholdType.PERCENTAGE && { color: '#FFFFFF' },
                        ]}
                      >
                        Percentual (%)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.alertTypeButton,
                        { borderColor: colors.border },
                        alert.thresholdType === ThresholdType.FIXED_AMOUNT && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => updateAlert(index, 'thresholdType', ThresholdType.FIXED_AMOUNT)}
                    >
                      <Text
                        style={[
                          styles.alertTypeButtonText,
                          { color: colors.text },
                          alert.thresholdType === ThresholdType.FIXED_AMOUNT && { color: '#FFFFFF' },
                        ]}
                      >
                        Valor (Kz)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Posição */}
                <View style={styles.alertField}>
                  <Text style={[styles.alertFieldLabel, { color: colors.text }]}>
                    Quando
                  </Text>
                  <View style={styles.alertTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.alertTypeButton,
                        { borderColor: colors.border },
                        alert.position === AlertPosition.BEFORE_LIMIT && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => updateAlert(index, 'position', AlertPosition.BEFORE_LIMIT)}
                    >
                      <Text
                        style={[
                          styles.alertTypeButtonText,
                          { color: colors.text },
                          alert.position === AlertPosition.BEFORE_LIMIT && { color: '#FFFFFF' },
                        ]}
                      >
                        Antes de atingir
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.alertTypeButton,
                        { borderColor: colors.border },
                        alert.position === AlertPosition.AFTER_LIMIT && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => updateAlert(index, 'position', AlertPosition.AFTER_LIMIT)}
                    >
                      <Text
                        style={[
                          styles.alertTypeButtonText,
                          { color: colors.text },
                          alert.position === AlertPosition.AFTER_LIMIT && { color: '#FFFFFF' },
                        ]}
                      >
                        Após atingir
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Canais de Notificação */}
                <View style={styles.alertField}>
                  <Text style={[styles.alertFieldLabel, { color: colors.text }]}>
                    Canais de Notificação
                  </Text>
                  <View style={styles.channelsContainer}>
                    <TouchableOpacity
                      style={styles.channelCheckbox}
                      onPress={() => updateAlertChannel(index, ChannelType.IN_APP, !getChannelEnabled(alert, ChannelType.IN_APP))}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border },
                          getChannelEnabled(alert, ChannelType.IN_APP) && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {getChannelEnabled(alert, ChannelType.IN_APP) && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                      <Ionicons name="notifications" size={18} color={colors.text} style={{ marginLeft: SPACING.xs }} />
                      <Text style={[styles.channelLabel, { color: colors.text }]}>App</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.channelCheckbox}
                      onPress={() => updateAlertChannel(index, ChannelType.EMAIL, !getChannelEnabled(alert, ChannelType.EMAIL))}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border },
                          getChannelEnabled(alert, ChannelType.EMAIL) && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {getChannelEnabled(alert, ChannelType.EMAIL) && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                      <Ionicons name="mail" size={18} color={colors.text} style={{ marginLeft: SPACING.xs }} />
                      <Text style={[styles.channelLabel, { color: colors.text }]}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.channelCheckbox}
                      onPress={() => updateAlertChannel(index, ChannelType.SMS, !getChannelEnabled(alert, ChannelType.SMS))}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border },
                          getChannelEnabled(alert, ChannelType.SMS) && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        {getChannelEnabled(alert, ChannelType.SMS) && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                      <Ionicons name="chatbubble" size={18} color={colors.text} style={{ marginLeft: SPACING.xs }} />
                      <Text style={[styles.channelLabel, { color: colors.text }]}>SMS</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.channelHint, { color: colors.textSecondary }]}>
                    Selecione pelo menos um canal
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
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

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  hint: {
    fontSize: 13,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  emptyState: {
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.xs,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    marginTop: SPACING.xs,
  },
  categoriesContent: {
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 2,
    gap: SPACING.xs,
    minWidth: 120,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: SPACING.sm,
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
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateInput: {
    flex: 1,
    padding: SPACING.sm,
    fontSize: 16,
    borderWidth: 0,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  addAlertButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAlerts: {
    padding: SPACING.xl,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyAlertsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyAlertsHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  alertCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeAlertButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertField: {
    marginBottom: SPACING.md,
  },
  alertFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  alertInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: 16,
  },
  alertTypeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  alertTypeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  alertTypeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  channelsContainer: {
    gap: SPACING.sm,
  },
  channelCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 14,
    marginLeft: SPACING.xs,
  },
  channelHint: {
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  saveButton: {
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxl,
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
