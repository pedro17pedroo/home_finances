import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useCurrency } from '../../hooks/useCurrency';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { SPACING } from '../../constants/config';
import api from '../../services/api';
import {
  getBudgets,
  BudgetWithStatus,
  BudgetStatus,
  TimePeriodType,
} from '../../services/budget.service';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon: string;
  color: string;
}

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
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();

  const [budgets, setBudgets] = useState<BudgetWithStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      const [budgetsData, categoriesRes] = await Promise.all([
        getBudgets(),
        api.get('/categories'),
      ]);
      setBudgets(budgetsData);
      const categoriesData = categoriesRes.data?.data || categoriesRes.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading budgets:', error);
      showToast({ message: 'Erro ao carregar orçamentos', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Recarregar quando a tela ganhar foco (após criar/editar/deletar)
  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [loadBudgets])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBudgets();
  }, [loadBudgets]);

  const handleBudgetPress = (budget: BudgetWithStatus) => {
    (navigation as any).navigate('BudgetDetail', { budgetId: budget.id });
  };

  const handleCreateBudget = () => {
    (navigation as any).navigate('BudgetForm', { mode: 'create' });
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
      return colors.textSecondary;
    }
    if (budget.isExceeded) {
      return colors.error;
    }
    if (budget.percentageUsed >= 90) {
      return colors.warning;
    }
    return colors.success;
  };

  const getProgressBarColor = (budget: BudgetWithStatus) => {
    if (budget.isExceeded) {
      return colors.error;
    }
    if (budget.percentageUsed >= 90) {
      return colors.warning;
    }
    return colors.success;
  };

  const getCategoryInfo = (categoryId: number) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const renderBudgetCard = ({ item: budget }: { item: BudgetWithStatus }) => {
    const statusColor = getStatusColor(budget);
    const progressColor = getProgressBarColor(budget);
    const progressWidth = Math.min(budget.percentageUsed, 100);
    const category = getCategoryInfo(budget.categoryId);

    return (
      <TouchableOpacity
        style={[
          styles.budgetCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          budget.status !== BudgetStatus.ACTIVE && styles.inactiveBudget,
        ]}
        onPress={() => handleBudgetPress(budget)}
      >
        <View style={styles.budgetHeader}>
          <View style={styles.budgetInfo}>
            <View style={styles.categoryRow}>
              {category && (
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={18} color={category.color} />
                </View>
              )}
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {category ? category.name : `Categoria #${budget.categoryId}`}
              </Text>
            </View>
            <Text style={[styles.timePeriod, { color: colors.textSecondary }]}>
              {getTimePeriodLabel(budget.timePeriod)}
            </Text>
          </View>
          <View style={styles.budgetAmount}>
            <Text style={[styles.amountText, { color: colors.text }]}>
              {formatCurrency(budget.amount)}
            </Text>
            {budget.status !== BudgetStatus.ACTIVE && (
              <Text style={[styles.statusBadge, { color: colors.textSecondary }]}>
                {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.spendingInfo}>
          <View style={styles.spendingRow}>
            <Text style={[styles.spendingLabel, { color: colors.textSecondary }]}>
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
          <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
            Restante: {formatCurrency(budget.remainingAmount)}
          </Text>
        )}

        {budget.alerts.length > 0 && (
          <View style={styles.alertsInfo}>
            <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.alertsText, { color: colors.textSecondary }]}>
              {budget.alerts.length} alerta{budget.alerts.length > 1 ? 's' : ''} configurado{budget.alerts.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
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
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>Orçamentos</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateBudget}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        renderItem={renderBudgetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💼"
            title="Nenhum orçamento"
            description="Crie seu primeiro orçamento para controlar seus gastos"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginHorizontal: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  budgetCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
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
});
