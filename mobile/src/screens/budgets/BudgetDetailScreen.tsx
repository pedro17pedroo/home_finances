import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useCurrency } from '../../hooks/useCurrency';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SPACING } from '../../constants/config';
import api from '../../services/api';
import {
  getBudget,
  deleteBudget,
  getBudgetHistory,
  BudgetWithStatus,
  BudgetHistory,
  BudgetStatus,
  TimePeriodType,
  AlertPosition,
  ThresholdType,
} from '../../services/budget.service';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon: string;
  color: string;
}

/**
 * Budget Detail Screen
 * 
 * Displays detailed budget information with:
 * - Budget information with current spending
 * - Spending visualization (progress bar)
 * - Configured alerts
 * - Edit and delete buttons
 * - Alert history from archived periods
 * 
 * Requirements: 5.2, 5.3, 7.1
 */
export default function BudgetDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();

  const params = route.params as { budgetId: number } | undefined;
  const budgetId = params?.budgetId;

  const [budget, setBudget] = useState<BudgetWithStatus | null>(null);
  const [history, setHistory] = useState<BudgetHistory[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!budgetId) return;

    try {
      const [budgetData, historyData] = await Promise.all([
        getBudget(budgetId),
        getBudgetHistory(budgetId),
      ]);
      setBudget(budgetData);
      setHistory(historyData);
      
      // Carregar informações da categoria
      if (budgetData.categoryId) {
        try {
          const categoriesRes = await api.get('/categories');
          const categories = categoriesRes.data?.data || categoriesRes.data || [];
          const foundCategory = categories.find((cat: Category) => cat.id === budgetData.categoryId);
          setCategory(foundCategory || null);
        } catch (error) {
          console.error('Error loading category:', error);
        }
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      showToast({ message: 'Erro ao carregar orçamento', type: 'error' });
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [budgetId, showToast, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recarregar quando a tela ganhar foco (após editar)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    (navigation as any).navigate('BudgetForm', {
      mode: 'edit',
      budgetId,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Orçamento',
      'Tem certeza que deseja excluir este orçamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budgetId!);
              showToast({ message: 'Orçamento excluído com sucesso', type: 'success' });
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting budget:', error);
              showToast({ message: 'Erro ao excluir orçamento', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const getTimePeriodLabel = (period: TimePeriodType): string => {
    const labels = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
      annual: 'Anual',
      custom: 'Personalizado',
    };
    return labels[period] || period;
  };

  const getAlertLabel = (alert: any): string => {
    const position = alert.position === AlertPosition.BEFORE_LIMIT ? 'antes' : 'depois';
    const threshold =
      alert.thresholdType === ThresholdType.PERCENTAGE
        ? `${alert.thresholdValue}%`
        : formatCurrency(alert.thresholdValue);
    return `${threshold} ${position} do limite`;
  };

  const getProgressColor = () => {
    if (!budget) return colors.success;
    if (budget.isExceeded) return colors.error;
    if (budget.percentageUsed >= 90) return colors.warning;
    return colors.success;
  };

  if (loading || !budget) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const progressWidth = Math.min(budget.percentageUsed, 100);
  const progressColor = getProgressColor();

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
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>Detalhes do Orçamento</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Informações do Orçamento
            </Text>
            {budget.status !== BudgetStatus.ACTIVE && (
              <Text style={[styles.statusBadge, { color: colors.textSecondary }]}>
                {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
              </Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Categoria:
            </Text>
            <View style={styles.categoryInfo}>
              {category && (
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={16} color={category.color} />
                </View>
              )}
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {category ? category.name : `#${budget.categoryId}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Período:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {getTimePeriodLabel(budget.timePeriod)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Valor do Orçamento:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatCurrency(budget.amount)}
            </Text>
          </View>
        </View>

        {/* Spending Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Gastos Atuais
          </Text>

          <View style={styles.spendingHeader}>
            <Text style={[styles.spendingAmount, { color: progressColor }]}>
              {formatCurrency(budget.currentSpending)}
            </Text>
            <Text style={[styles.percentageText, { color: progressColor }]}>
              {budget.percentageUsed.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressWidth}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
          </View>

          {budget.isExceeded ? (
            <Text style={[styles.remainingText, { color: colors.error }]}>
              Excedido em {formatCurrency(budget.exceededAmount)}
            </Text>
          ) : (
            <Text style={[styles.remainingText, { color: colors.success }]}>
              Restante: {formatCurrency(budget.remainingAmount)}
            </Text>
          )}
        </View>

        {/* Alerts Card */}
        {budget.alerts.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Alertas Configurados
            </Text>

            {budget.alerts.map((alert, index) => (
              <View
                key={alert.id}
                style={[
                  styles.alertItem,
                  { borderBottomColor: colors.border },
                  index === budget.alerts.length - 1 && styles.alertItemLast,
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertText, { color: colors.text }]}>
                    {getAlertLabel(alert)}
                  </Text>
                  <View style={styles.channelsRow}>
                    {alert.channels.map((channel: any) =>
                      channel.enabled ? (
                        <View
                          key={channel.type}
                          style={[
                            styles.channelBadge,
                            { backgroundColor: `${colors.primary}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.channelText,
                              { color: colors.primary },
                            ]}
                          >
                            {channel.type === 'in_app'
                              ? 'App'
                              : channel.type === 'email'
                              ? 'Email'
                              : 'SMS'}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* History Card */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Histórico de Períodos
            </Text>

            {history.map((period, index) => (
              <View
                key={period.id}
                style={[
                  styles.historyItem,
                  { borderBottomColor: colors.border },
                  index === history.length - 1 && styles.historyItemLast,
                ]}
              >
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {new Date(period.periodStartDate).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(period.periodEndDate).toLocaleDateString('pt-BR')}
                </Text>
                <View style={styles.historyRow}>
                  <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>
                    Gasto:
                  </Text>
                  <Text style={[styles.historyValue, { color: colors.text }]}>
                    {formatCurrency(period.finalSpendingAmount)}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>
                    Percentual:
                  </Text>
                  <Text style={[styles.historyValue, { color: colors.text }]}>
                    {period.percentageUsed.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    flex: 1,
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
  card: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  spendingAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  percentageText: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  alertItemLast: {
    borderBottomWidth: 0,
  },
  alertInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  alertText: {
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  channelBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: SPACING.xs,
    marginBottom: 4,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyDate: {
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyLabel: {
    fontSize: 14,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
