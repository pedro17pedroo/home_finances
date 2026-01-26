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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useCurrency } from '../../hooks/useCurrency';
import LoadingSpinner from '../../components/LoadingSpinner';
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
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();

  const params = route.params as { budgetId: number } | undefined;
  const budgetId = params?.budgetId;

  const [budget, setBudget] = useState<BudgetWithStatus | null>(null);
  const [history, setHistory] = useState<BudgetHistory[]>([]);
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
    } catch (error) {
      console.error('Error loading budget:', error);
      showToast('Erro ao carregar orçamento', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [budgetId, showToast, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    navigation.navigate('BudgetForm' as never, {
      mode: 'edit',
      budgetId,
    } as never);
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
              showToast('Orçamento excluído com sucesso', 'success');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting budget:', error);
              showToast('Erro ao excluir orçamento', 'error');
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
    if (!budget) return theme.colors.success;
    if (budget.isExceeded) return theme.colors.error;
    if (budget.percentageUsed >= 90) return theme.colors.warning;
    return theme.colors.success;
  };

  if (loading || !budget) {
    return <LoadingSpinner />;
  }

  const progressWidth = Math.min(budget.percentageUsed, 100);
  const progressColor = getProgressColor();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Budget Info Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Informações do Orçamento
            </Text>
            {budget.status !== BudgetStatus.ACTIVE && (
              <Text style={[styles.statusBadge, { color: theme.colors.textSecondary }]}>
                {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
              </Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Categoria:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              #{budget.categoryId}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Período:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {getTimePeriodLabel(budget.timePeriod)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              Valor do Orçamento:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {formatCurrency(budget.amount)}
            </Text>
          </View>
        </View>

        {/* Spending Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
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
                { backgroundColor: theme.colors.border },
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
            <Text style={[styles.remainingText, { color: theme.colors.error }]}>
              Excedido em {formatCurrency(budget.exceededAmount)}
            </Text>
          ) : (
            <Text style={[styles.remainingText, { color: theme.colors.success }]}>
              Restante: {formatCurrency(budget.remainingAmount)}
            </Text>
          )}
        </View>

        {/* Alerts Card */}
        {budget.alerts.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Alertas Configurados
            </Text>

            {budget.alerts.map((alert, index) => (
              <View
                key={alert.id}
                style={[
                  styles.alertItem,
                  { borderBottomColor: theme.colors.border },
                  index === budget.alerts.length - 1 && styles.alertItemLast,
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertText, { color: theme.colors.text }]}>
                    {getAlertLabel(alert)}
                  </Text>
                  <View style={styles.channelsRow}>
                    {alert.channels.map((channel: any) =>
                      channel.enabled ? (
                        <View
                          key={channel.type}
                          style={[
                            styles.channelBadge,
                            { backgroundColor: `${theme.colors.primary}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.channelText,
                              { color: theme.colors.primary },
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
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Histórico de Períodos
            </Text>

            {history.map((period, index) => (
              <View
                key={period.id}
                style={[
                  styles.historyItem,
                  { borderBottomColor: theme.colors.border },
                  index === history.length - 1 && styles.historyItemLast,
                ]}
              >
                <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                  {new Date(period.periodStartDate).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(period.periodEndDate).toLocaleDateString('pt-BR')}
                </Text>
                <View style={styles.historyRow}>
                  <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                    Gasto:
                  </Text>
                  <Text style={[styles.historyValue, { color: theme.colors.text }]}>
                    {formatCurrency(period.finalSpendingAmount)}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={[styles.historyLabel, { color: theme.colors.textSecondary }]}>
                    Percentual:
                  </Text>
                  <Text style={[styles.historyValue, { color: theme.colors.text }]}>
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
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
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
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 16,
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
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 12,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  alertItemLast: {
    borderBottomWidth: 0,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertText: {
    fontSize: 14,
    marginBottom: 8,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyDate: {
    fontSize: 14,
    marginBottom: 8,
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
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
