import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface RecurringTransaction {
  id: number;
  type: 'receita' | 'despesa';
  description: string;
  amount: string;
  categoryId: number | null;
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

interface Props {
  navigation: any;
}

export const RecurringTransactionsScreen: React.FC<Props> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchRecurringTransactions = useCallback(async () => {
    try {
      console.log('Fetching recurring transactions from API...');
      const response = await api.get('/recurring-transactions');
      const data = response.data;
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      if (data.status === 'success' && data.data?.recurringTransactions) {
        setTransactions(data.data.recurringTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar:', error.message);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchRecurringTransactions);
    return unsubscribe;
  }, [navigation, fetchRecurringTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecurringTransactions();
  };

  const getFilteredTransactions = () => {
    if (filter === 'active') return transactions.filter(t => t.isActive);
    if (filter === 'paused') return transactions.filter(t => !t.isActive);
    return transactions;
  };

  const getActiveCount = () => transactions.filter(t => t.isActive).length;
  const getPausedCount = () => transactions.filter(t => !t.isActive).length;

  const getTotalMonthlyIncome = () => {
    return transactions.filter(t => t.isActive && t.type === 'receita').reduce((total, t) => {
      const amount = parseFloat(t.amount);
      if (t.frequency === 'daily') return total + amount * 30;
      if (t.frequency === 'weekly') return total + amount * 4;
      if (t.frequency === 'yearly') return total + amount / 12;
      return total + amount;
    }, 0);
  };

  const getTotalMonthlyExpenses = () => {
    return transactions.filter(t => t.isActive && t.type === 'despesa').reduce((total, t) => {
      const amount = parseFloat(t.amount);
      if (t.frequency === 'daily') return total + amount * 30;
      if (t.frequency === 'weekly') return total + amount * 4;
      if (t.frequency === 'yearly') return total + amount / 12;
      return total + amount;
    }, 0);
  };

  const toggleStatus = async (id: number, isActive: boolean) => {
    setActionLoading(id);
    try {
      await api.post(`/recurring-transactions/${id}/${isActive ? 'deactivate' : 'activate'}`);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, isActive: !isActive } : t));
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao alterar status');
    } finally {
      setActionLoading(null);
    }
  };

  const executeNow = (id: number) => {
    Alert.alert('Executar Agora', 'Deseja executar esta transação agora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Executar',
        onPress: async () => {
          setActionLoading(id);
          try {
            await api.post(`/recurring-transactions/${id}/execute`);
            Alert.alert('Sucesso', 'Transação executada!');
            fetchRecurringTransactions();
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.message || 'Erro ao executar');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const deleteTransaction = (id: number) => {
    Alert.alert('Excluir', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await api.delete(`/recurring-transactions/${id}`);
            setTransactions(prev => prev.filter(t => t.id !== id));
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.message || 'Erro ao excluir');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const getFrequencyText = (f: string) => {
    if (f === 'daily') return 'Diário';
    if (f === 'weekly') return 'Semanal';
    if (f === 'monthly') return 'Mensal';
    if (f === 'yearly') return 'Anual';
    return f;
  };

  const getDaysUntilNext = (date: string) => {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const filtered = getFilteredTransactions();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações Recorrentes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddRecurringTransaction')}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.statsContainer}>
          <StatCard title="Receitas Mensais" value={formatCurrency(getTotalMonthlyIncome())} icon="trending-up" iconColor={COLORS.success} />
          <StatCard title="Despesas Mensais" value={formatCurrency(getTotalMonthlyExpenses())} icon="trending-down" iconColor={COLORS.error} />
        </View>

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

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'active', 'paused'] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.filterButton, filter === f && styles.filterButtonActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? `Todas (${transactions.length})` : f === 'active' ? `Ativas (${getActiveCount()})` : `Pausadas (${getPausedCount()})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.quickActionContainer}>
          <Button title="Nova Transação Recorrente" onPress={() => navigation.navigate('AddRecurringTransaction')} variant="primary" fullWidth size="lg" />
        </View>

        <View style={styles.transactionsList}>
          {filtered.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="repeat" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma transação recorrente</Text>
              <Text style={styles.emptySubtitle}>Crie transações recorrentes para automatizar suas finanças</Text>
              <Button title="Criar Primeira Transação" onPress={() => navigation.navigate('AddRecurringTransaction')} variant="outline" />
            </Card>
          ) : (
            filtered.map((t) => {
              const days = getDaysUntilNext(t.nextExecution);
              const isOverdue = days < 0;
              const isUpcoming = days <= 3 && days >= 0;
              const isLoading = actionLoading === t.id;
              
              return (
                <Card key={t.id} style={[styles.transactionCard, !t.isActive && styles.pausedCard, isOverdue && t.isActive && styles.overdueCard, isUpcoming && t.isActive && styles.upcomingCard]}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIcon}>
                      <Ionicons name={t.type === 'receita' ? 'trending-up' : 'trending-down'} size={20} color={t.type === 'receita' ? COLORS.success : COLORS.error} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>{t.description}</Text>
                      <Text style={styles.transactionCategory}>{t.categoryName || 'Sem categoria'} • {t.accountName}</Text>
                    </View>
                    <Text style={[styles.amountText, { color: t.type === 'receita' ? COLORS.success : COLORS.error }]}>
                      {t.type === 'receita' ? '+' : '-'}{formatCurrency(parseFloat(t.amount))}
                    </Text>
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.frequencyContainer}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.frequencyText}>{getFrequencyText(t.frequency)}</Text>
                      {!t.isActive && <View style={styles.pausedBadge}><Text style={styles.pausedBadgeText}>Pausada</Text></View>}
                    </View>
                    <Text style={styles.executionText}>📅 Próxima: {formatDate(t.nextExecution)}{t.isActive && isOverdue && <Text style={styles.overdueText}> (atrasada)</Text>}</Text>
                    {t.lastExecution && <Text style={styles.executionText}>✅ Última: {formatRelativeDate(t.lastExecution)}</Text>}
                    <Text style={styles.executionText}>🔄 Executada {t.executionCount} vezes</Text>
                  </View>

                  <View style={styles.transactionActions}>
                    <Button title={t.isActive ? "Pausar" : "Ativar"} onPress={() => toggleStatus(t.id, t.isActive)} variant={t.isActive ? "outline" : "primary"} size="sm" loading={isLoading} disabled={isLoading} />
                    <Button title="Excluir" onPress={() => deleteTransaction(t.id)} variant="outline" size="sm" disabled={isLoading} />
                    <Button title="Executar Agora" onPress={() => executeNow(t.id)} variant="primary" size="sm" disabled={!t.isActive || isLoading} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  scrollView: { flex: 1 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  summaryContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  summaryCard: { padding: SPACING.md },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary },
  filtersContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  filterButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: 'white' },
  quickActionContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  transactionsList: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  emptyCard: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  transactionCard: { marginBottom: SPACING.md },
  pausedCard: { opacity: 0.6 },
  overdueCard: { borderColor: COLORS.error, borderWidth: 1 },
  upcomingCard: { borderColor: COLORS.warning, borderWidth: 1 },
  transactionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  transactionInfo: { flex: 1 },
  transactionDescription: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  transactionCategory: { fontSize: 12, color: COLORS.textSecondary },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  transactionDetails: { marginBottom: SPACING.md, gap: SPACING.xs },
  frequencyContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  frequencyText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  pausedBadge: { backgroundColor: COLORS.warning, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 10, marginLeft: SPACING.sm },
  pausedBadgeText: { fontSize: 10, color: 'white', fontWeight: '600' },
  executionText: { fontSize: 12, color: COLORS.textSecondary },
  overdueText: { color: COLORS.error, fontWeight: '500' },
  transactionActions: { flexDirection: 'row', gap: SPACING.sm },
});
