import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Loading, EmptyState } from '../../components/ui';
import { Transaction } from '../../types';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface TransactionsScreenProps {
  navigation?: any;
}

type FilterType = 'all' | 'receita' | 'despesa';

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      const data = response.data?.data?.transactions || response.data?.transactions || response.data?.data || response.data;
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    return type === 'receita' ? 'trending-up' : 'trending-down';
  };

  const getTransactionColor = (type: string) => {
    return type === 'receita' ? colors.success : colors.error;
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const getMonthlyTotal = (type: 'receita' | 'despesa') => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === type && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
      })
      .reduce((total, t) => total + parseFloat(t.amount), 0);
  };

  if (loading) {
    return <Loading message="Carregando transações..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transações</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation?.navigate('AddTransaction', {})}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Mensal */}
        <View style={styles.summaryContainer}>
          <Card variant="elevated" padding="md" style={styles.summaryCardIncome}>
            <Ionicons name="trending-up" size={20} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(getMonthlyTotal('receita'))}</Text>
          </Card>

          <Card variant="elevated" padding="md" style={styles.summaryCardExpense}>
            <Ionicons name="trending-down" size={20} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(getMonthlyTotal('despesa'))}</Text>
          </Card>
        </View>

        {/* Filtros */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.surfaceSecondary }]}>
          {([
            { key: 'all', label: 'Todas' },
            { key: 'receita', label: 'Receitas' },
            { key: 'despesa', label: 'Despesas' },
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterButton,
                filter === item.key && { backgroundColor: colors.surface },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === item.key ? colors.text : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de Transações */}
        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => navigation?.navigate('TransactionDetails', { transaction })}
              >
                <Card variant="default" padding="md" style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <View
                        style={[
                          styles.transactionIconContainer,
                          { backgroundColor: `${getTransactionColor(transaction.type)}15` },
                        ]}
                      >
                        <Ionicons
                          name={getTransactionIcon(transaction.type)}
                          size={20}
                          color={getTransactionColor(transaction.type)}
                        />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={[styles.transactionCategory, { color: colors.text }]}>
                          {typeof transaction.category === 'object' 
                            ? transaction.category?.name 
                            : transaction.category || 'Sem categoria'}
                        </Text>
                        {transaction.description && (
                          <Text
                            style={[styles.transactionDescription, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {transaction.description}
                          </Text>
                        )}
                        <View style={styles.transactionMeta}>
                          <Text style={[styles.transactionDate, { color: colors.textTertiary }]}>
                            {formatDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.transactionAmount}>
                      <Text
                        style={[
                          styles.amountText,
                          { color: getTransactionColor(transaction.type) },
                        ]}
                      >
                        {transaction.type === 'receita' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Nenhuma transação"
            description="Adicione sua primeira transação para começar a controlar suas finanças"
            actionLabel="Adicionar Transação"
            onAction={() => navigation?.navigate('AddTransaction', {})}
          />
        )}

        {/* Botões de Ação */}
        {filteredTransactions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Button
              title="Nova Receita"
              onPress={() => navigation?.navigate('AddTransaction', { type: 'receita' })}
              fullWidth
              size="lg"
              icon="trending-up-outline"
            />
            <Button
              title="Nova Despesa"
              onPress={() => navigation?.navigate('AddTransaction', { type: 'despesa' })}
              variant="outline"
              fullWidth
              size="lg"
              icon="trending-down-outline"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardIncome: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#10B981',
  },
  summaryCardExpense: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.xs,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: SPACING.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  transactionsList: {
    gap: SPACING.sm,
  },
  transactionCard: {
    marginBottom: 0,
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
    fontSize: 15,
    fontWeight: '600',
  },
  transactionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 11,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
});
