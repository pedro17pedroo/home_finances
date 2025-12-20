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
import { Transaction } from '../../types';
import { COLORS, SPACING } from '../../constants/config';

export const TransactionsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'receita' | 'despesa'>('all');

  const fetchTransactions = async () => {
    try {
      // Simular dados das transações
      const mockTransactions: Transaction[] = [
        {
          id: 1,
          amount: '50000.00',
          type: 'receita',
          category: 'Salário',
          description: 'Salário mensal',
          date: '2024-12-18T10:00:00Z',
          accountId: 1,
          userId: 1,
        },
        {
          id: 2,
          amount: '15000.00',
          type: 'despesa',
          category: 'Alimentação',
          description: 'Supermercado',
          date: '2024-12-17T15:30:00Z',
          accountId: 1,
          userId: 1,
        },
        {
          id: 3,
          amount: '25000.00',
          type: 'receita',
          category: 'Freelance',
          description: 'Projeto web',
          date: '2024-12-16T09:15:00Z',
          accountId: 2,
          userId: 1,
        },
        {
          id: 4,
          amount: '8000.00',
          type: 'despesa',
          category: 'Transporte',
          description: 'Combustível',
          date: '2024-12-15T18:45:00Z',
          accountId: 1,
          userId: 1,
        },
        {
          id: 5,
          amount: '12000.00',
          type: 'despesa',
          category: 'Lazer',
          description: 'Cinema',
          date: '2024-12-14T20:00:00Z',
          accountId: 1,
          userId: 1,
        },
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'receita' ? 'trending-up' : 'trending-down';
  };

  const getTransactionColor = (type: string) => {
    return type === 'receita' ? COLORS.success : COLORS.error;
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const getMonthlyTotal = (type: 'receita' | 'despesa') => {
    return transactions
      .filter(t => t.type === type)
      .reduce((total, t) => total + parseFloat(t.amount), 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando transações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.addButton}>
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
        {/* Resumo Mensal */}
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, { backgroundColor: COLORS.success }]}>
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(getMonthlyTotal('receita').toString())}
            </Text>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: COLORS.error }]}>
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(getMonthlyTotal('despesa').toString())}
            </Text>
          </Card>
        </View>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'receita' && styles.filterButtonActive]}
            onPress={() => setFilter('receita')}
          >
            <Text style={[styles.filterText, filter === 'receita' && styles.filterTextActive]}>
              Receitas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'despesa' && styles.filterButtonActive]}
            onPress={() => setFilter('despesa')}
          >
            <Text style={[styles.filterText, filter === 'despesa' && styles.filterTextActive]}>
              Despesas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Transações */}
        <View style={styles.transactionsList}>
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <View style={[
                    styles.transactionIconContainer,
                    { backgroundColor: `${getTransactionColor(transaction.type)}15` }
                  ]}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type)}
                      size={20}
                      color={getTransactionColor(transaction.type)}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>
                      {transaction.category}
                    </Text>
                    {transaction.description && (
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                    )}
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amountText,
                    { color: getTransactionColor(transaction.type) }
                  ]}>
                    {transaction.type === 'receita' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionsContainer}>
          <Button
            title="Nova Receita"
            onPress={() => {}}
            variant="primary"
            fullWidth
            size="large"
          />
          <Button
            title="Nova Despesa"
            onPress={() => {}}
            variant="outline"
            fullWidth
            size="large"
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.xs,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterTextActive: {
    color: 'white',
  },
  transactionsList: {
    paddingHorizontal: SPACING.lg,
  },
  transactionCard: {
    marginBottom: SPACING.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  transactionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  transactionDate: {
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
  actionsContainer: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
});