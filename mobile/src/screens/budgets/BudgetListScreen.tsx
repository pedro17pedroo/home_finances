import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useCurrency } from '../../hooks/useCurrency';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  getBudgets,
  BudgetWithStatus,
  BudgetStatus,
  TimePeriodType,
} from '../../services/budget.service';

/**
 * Budget List Screen
 * 
 * Displays all budgets for the user's organization with:
 * - Budget card showing category, amount, period, status
 * - Progress bar with percentage used
 * - Visual styling for exceeded/inactive budgets
 * - Navigation to budget detail
 * - Floating action button to create new budget
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1
 */
export default function BudgetListScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();

  const [budgets, setBudgets] = useState<BudgetWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
      showToast('Erro ao carregar orçamentos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBudgets();
  }, [loadBudgets]);

  const handleBudgetPress = (budget: BudgetWithStatus) => {
    navigation.navigate('BudgetDetail' as never, { budgetId: budget.id } as never);
  };

  const handleCreateBudget = () => {
    navigation.navigate('BudgetForm' as never, { mode: 'create' } as never);
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

  const getStatusColor = (budget: BudgetWithStatus) => {
    if (budget.status === BudgetStatus.INACTIVE || budget.status === BudgetStatus.ARCHIVED) {
      return theme.colors.textSecondary;
    }
    if (budget.isExceeded) {
      return theme.colors.error;
    }
    if (budget.percentageUsed >= 90) {
      return theme.colors.warning;
    }
    return theme.colors.success;
  };

  const getProgressBarColor = (budget: BudgetWithStatus) => {
    if (budget.isExceeded) {
      return theme.colors.error;
    }
    if (budget.percentageUsed >= 90) {
      return theme.colors.warning;
    }
    return theme.colors.success;
  };

  const renderBudgetCard = ({ item: budget }: { item: BudgetWithStatus }) => {
    const statusColor = getStatusColor(budget);
    const progressColor = getProgressBarColor(budget);
    const progressWidth = Math.min(budget.percentageUsed, 100);

    return (
      <TouchableOpacity
        style={[
          styles.budgetCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          budget.status !== BudgetStatus.ACTIVE && styles.inactiveBudget,
        ]}
        onPress={() => handleBudgetPress(budget)}
      >
        <View style={styles.budgetHeader}>
          <View style={styles.budgetInfo}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              Categoria #{budget.categoryId}
            </Text>
            <Text style={[styles.timePeriod, { color: theme.colors.textSecondary }]}>
              {getTimePeriodLabel(budget.timePeriod)}
            </Text>
          </View>
          <View style={styles.budgetAmount}>
            <Text style={[styles.amountText, { color: theme.colors.text }]}>
              {formatCurrency(budget.amount)}
            </Text>
            {budget.status !== BudgetStatus.ACTIVE && (
              <Text style={[styles.statusBadge, { color: theme.colors.textSecondary }]}>
                {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.spendingInfo}>
          <View style={styles.spendingRow}>
            <Text style={[styles.spendingLabel, { color: theme.colors.textSecondary }]}>
              Gasto:
            </Text>
            <Text style={[styles.spendingValue, { color: statusColor }]}>
              {formatCurrency(budget.currentSpending)}
            </Text>
          </View>
          <Text style={[styles.percentageText, { color: statusColor }]}>
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
          <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
            Restante: {formatCurrency(budget.remainingAmount)}
          </Text>
        )}

        {budget.alerts.length > 0 && (
          <View style={styles.alertsInfo}>
            <Ionicons name="notifications-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.alertsText, { color: theme.colors.textSecondary }]}>
              {budget.alerts.length} alerta{budget.alerts.length > 1 ? 's' : ''} configurado{budget.alerts.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={budgets}
        renderItem={renderBudgetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="Nenhum orçamento"
            message="Crie seu primeiro orçamento para controlar seus gastos"
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreateBudget}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  budgetCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inactiveBudget: {
    opacity: 0.6,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  timePeriod: {
    fontSize: 14,
  },
  budgetAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 12,
    marginTop: 4,
  },
  spendingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spendingLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  spendingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    marginBottom: 8,
  },
  alertsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  alertsText: {
    fontSize: 12,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
