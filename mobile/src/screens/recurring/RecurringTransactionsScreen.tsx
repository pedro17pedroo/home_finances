import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';

interface RecurringTransaction {
  id: number;
  type: 'receita' | 'despesa';
  description: string;
  amount: string;
  categoryId: number;
  categoryName: string;
  accountId: number;
  accountName: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isActive: boolean;
  nextExecution: string;
  lastExecution?: string;
  createdAt: string;
  executionCount: number;
  userId: number;
}

interface RecurringTransactionsScreenProps {
  navigation: any;
}

export const RecurringTransactionsScreen: React.FC<RecurringTransactionsScreenProps> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchRecurringTransactions = async () => {
    try {
      // Simular dados de transações recorrentes
      const mockTransactions: RecurringTransaction[] = [
        {
          id: 1,
          type: 'receita',
          description: 'Salário',
          amount: '350000.00',
          categoryId: 1,
          categoryName: 'Salário',
          accountId: 1,
          accountName: 'Conta Corrente BAI',
          frequency: 'monthly',
          isActive: true,
          nextExecution: '2025-01-01T00:00:00Z',
          lastExecution: '2024-12-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          executionCount: 12,
          userId: 1,
        },
        {
          id: 2,
          type: 'despesa',
          description: 'Aluguel',
          amount: '120000.00',
          categoryId: 2,
          categoryName: 'Moradia',
          accountId: 1,
          accountName: 'Conta Corrente BAI',
          frequency: 'monthly',
          isActive: true,
          nextExecution: '2024-12-25T00:00:00Z',
          lastExecution: '2024-11-25T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          executionCount: 12,
          userId: 1,
        },
        {
          id: 3,
          type: 'despesa',
          description: 'Internet',
          amount: '15000.00',
          categoryId: 3,
          categoryName: 'Utilidades',
          accountId: 1,
          accountName: 'Conta Corrente BAI',
          frequency: 'monthly',
          isActive: true,
          nextExecution: '2024-12-20T00:00:00Z',
          lastExecution: '2024-11-20T00:00:00Z',
          createdAt: '2024-02-01T00:00:00Z',
          executionCount: 11,
          userId: 1,
        },
        {
          id: 4,
          type: 'despesa',
          description: 'Academia',
          amount: '25000.00',
          categoryId: 4,
          categoryName: 'Saúde',
          accountId: 2,
          accountName: 'Conta Poupança BFA',
          frequency: 'monthly',
          isActive: false,
          nextExecution: '2024-12-15T00:00:00Z',
          lastExecution: '2024-10-15T00:00:00Z',
          createdAt: '2024-03-01T00:00:00Z',
          executionCount: 8,
          userId: 1,
        },
        {
          id: 5,
          type: 'receita',
          description: 'Freelance',
          amount: '80000.00',
          categoryId: 5,
          categoryName: 'Trabalho Extra',
          accountId: 1,
          accountName: 'Conta Corrente BAI',
          frequency: 'weekly',
          isActive: true,
          nextExecution: '2024-12-22T00:00:00Z',
          lastExecution: '2024-12-15T00:00:00Z',
          createdAt: '2024-06-01T00:00:00Z',
          executionCount: 26,
          userId: 1,
        },
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Erro ao carregar transações recorrentes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecurringTransactions();
  };

  const getFilteredTransactions = () => {
    switch (filter) {
      case 'active':
        return transactions.filter(t => t.isActive);
      case 'paused':
        return transactions.filter(t => !t.isActive);
      default:
        return transactions;
    }
  };

  const getActiveCount = () => transactions.filter(t => t.isActive).length;
  const getPausedCount = () => transactions.filter(t => !t.isActive).length;

  const getTotalMonthlyIncome = () => {
    return transactions
      .filter(t => t.isActive && t.type === 'receita')
      .reduce((total, t) => {
        const amount = parseFloat(t.amount);
        switch (t.frequency) {
          case 'daily':
            return total + (amount * 30);
          case 'weekly':
            return total + (amount * 4);
          case 'monthly':
            return total + amount;
          case 'yearly':
            return total + (amount / 12);
          default:
            return total;
        }
      }, 0);
  };

  const getTotalMonthlyExpenses = () => {
    return transactions
      .filter(t => t.isActive && t.type === 'despesa')
      .reduce((total, t) => {
        const amount = parseFloat(t.amount);
        switch (t.frequency) {
          case 'daily':
            return total + (amount * 30);
          case 'weekly':
            return total + (amount * 4);
          case 'monthly':
            return total + amount;
          case 'yearly':
            return total + (amount / 12);
          default:
            return total;
        }
      }, 0);
  };

  const toggleTransactionStatus = (transactionId: number) => {
    setTransactions(prev =>
      prev.map(transaction =>
        transaction.id === transactionId
          ? { ...transaction, isActive: !transaction.isActive }
          : transaction
      )
    );
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Diário';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensal';
      case 'yearly':
        return 'Anual';
      default:
        return frequency;
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'today';
      case 'weekly':
        return 'calendar';
      case 'monthly':
        return 'calendar-outline';
      case 'yearly':
        return 'calendar-clear';
      default:
        return 'time';
    }
  };

  const getDaysUntilNext = (nextExecution: string) => {
    const next = new Date(nextExecution);
    const today = new Date();
    const diffTime = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando transações recorrentes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações Recorrentes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRecurringTransaction')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Receitas Mensais"
            value={formatCurrency(getTotalMonthlyIncome())}
            icon="trending-up"
            color={COLORS.success}
          />
          <StatCard
            title="Despesas Mensais"
            value={formatCurrency(getTotalMonthlyExpenses())}
            icon="trending-down"
            color={COLORS.error}
          />
        </View>

        {/* Resumo */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Ionicons name="play-circle" size={16} color={COLORS.success} />
                <Text style={styles.summaryLabel}>Ativas: {getActiveCount()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="pause-circle" size={16} color={COLORS.warning} />
                <Text style={styles.summaryLabel}>Pausadas: {getPausedCount()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="list" size={16} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Total: {transactions.length}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'all' && styles.filterTextActive,
                ]}
              >
                Todas ({transactions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'active' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('active')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'active' && styles.filterTextActive,
                ]}
              >
                Ativas ({getActiveCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'paused' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('paused')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'paused' && styles.filterTextActive,
                ]}
              >
                Pausadas ({getPausedCount()})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Nova Transação Recorrente"
            onPress={() => navigation.navigate('AddRecurringTransaction')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Lista de Transações */}
        <View style={styles.transactionsList}>
          {filteredTransactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="repeat" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Nenhuma transação recorrente' : 
                 filter === 'active' ? 'Nenhuma transação ativa' :
                 'Nenhuma transação pausada'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' 
                  ? 'Crie transações recorrentes para automatizar suas finanças'
                  : 'Altere o filtro para ver outras transações'
                }
              </Text>
              {filter === 'all' && (
                <Button
                  title="Criar Primeira Transação"
                  onPress={() => navigation.navigate('AddRecurringTransaction')}
                  variant="outline"
                />
              )}
            </Card>
          ) : (
            filteredTransactions.map((transaction) => {
              const daysUntilNext = getDaysUntilNext(transaction.nextExecution);
              const isOverdue = daysUntilNext < 0;
              const isUpcoming = daysUntilNext <= 3 && daysUntilNext >= 0;
              
              return (
                <Card 
                  key={transaction.id} 
                  style={[
                    styles.transactionCard,
                    !transaction.isActive && styles.pausedCard,
                    isOverdue && styles.overdueCard,
                    isUpcoming && styles.upcomingCard,
                  ]}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIcon}>
                      <Ionicons
                        name={transaction.type === 'receita' ? 'trending-up' : 'trending-down'}
                        size={20}
                        color={transaction.type === 'receita' ? COLORS.success : COLORS.error}
                      />
                    </View>
                    
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionCategory}>
                        {transaction.categoryName} • {transaction.accountName}
                      </Text>
                    </View>
                    
                    <View style={styles.transactionAmount}>
                      <Text style={[
                        styles.amountText,
                        { color: transaction.type === 'receita' ? COLORS.success : COLORS.error }
                      ]}>
                        {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.frequencyContainer}>
                      <Ionicons
                        name={getFrequencyIcon(transaction.frequency)}
                        size={14}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.frequencyText}>
                        {getFrequencyText(transaction.frequency)}
                      </Text>
                    </View>

                    <View style={styles.executionInfo}>
                      <Text style={styles.executionText}>
                        📅 Próxima: {formatDate(transaction.nextExecution)}
                        {daysUntilNext >= 0 && (
                          <Text style={[
                            styles.daysText,
                            isUpcoming && { color: COLORS.warning },
                            isOverdue && { color: COLORS.error }
                          ]}>
                            {' '}({daysUntilNext === 0 ? 'hoje' : 
                              daysUntilNext === 1 ? 'amanhã' : 
                              `${daysUntilNext} dias`})
                          </Text>
                        )}
                        {isOverdue && (
                          <Text style={styles.overdueText}>
                            {' '}(atrasada)
                          </Text>
                        )}
                      </Text>
                      
                      {transaction.lastExecution && (
                        <Text style={styles.executionText}>
                          ✅ Última: {formatRelativeDate(transaction.lastExecution)}
                        </Text>
                      )}
                      
                      <Text style={styles.executionText}>
                        🔄 Executada {transaction.executionCount} vezes
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionActions}>
                    <Button
                      title={transaction.isActive ? "Pausar" : "Ativar"}
                      onPress={() => toggleTransactionStatus(transaction.id)}
                      variant={transaction.isActive ? "outline" : "primary"}
                      size="small"
                    />
                    <Button
                      title="Editar"
                      onPress={() => {}}
                      variant="outline"
                      size="small"
                    />
                    <Button
                      title="Executar Agora"
                      onPress={() => {}}
                      variant="primary"
                      size="small"
                      disabled={!transaction.isActive}
                    />
                  </View>
                </Card>
              );
            })
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    padding: SPACING.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  transactionsList: {
    paddingHorizontal: SPACING.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  transactionCard: {
    marginBottom: SPACING.md,
  },
  pausedCard: {
    opacity: 0.6,
    backgroundColor: `${COLORS.textSecondary}05`,
  },
  overdueCard: {
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  upcomingCard: {
    backgroundColor: `${COLORS.warning}05`,
    borderColor: COLORS.warning,
    borderWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  transactionCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  frequencyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  executionInfo: {
    gap: SPACING.xs,
  },
  executionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  daysText: {
    fontWeight: '500',
  },
  overdueText: {
    color: COLORS.error,
    fontWeight: '500',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});