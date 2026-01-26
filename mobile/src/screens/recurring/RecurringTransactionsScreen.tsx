import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import recurringTransactionsService, { RecurringTransaction } from '../../services/recurring-transactions.service';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { SPACING } from '../../constants/config';

export function RecurringTransactionsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    try {
      const data = await recurringTransactionsService.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar transações recorrentes:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações recorrentes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await recurringTransactionsService.deactivate(id);
        Alert.alert('Sucesso', 'Transação recorrente desativada');
      } else {
        await recurringTransactionsService.activate(id);
        Alert.alert('Sucesso', 'Transação recorrente ativada');
      }
      loadTransactions();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar o status');
    }
  };

  const handleExecuteNow = async (id: number) => {
    Alert.alert(
      'Confirmar Execução',
      'Deseja executar esta transação agora?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Executar',
          onPress: async () => {
            try {
              await recurringTransactionsService.executeNow(id);
              Alert.alert('Sucesso', 'Transação executada com sucesso');
              loadTransactions();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.message || 'Erro ao executar transação');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja excluir esta transação recorrente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await recurringTransactionsService.delete(id);
              Alert.alert('Sucesso', 'Transação recorrente excluída');
              loadTransactions();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a transação');
            }
          },
        },
      ]
    );
  };

  const getFrequencyLabel = (frequency: string, interval: number) => {
    const labels: Record<string, string> = {
      daily: interval === 1 ? 'Diária' : `A cada ${interval} dias`,
      weekly: interval === 1 ? 'Semanal' : `A cada ${interval} semanas`,
      monthly: interval === 1 ? 'Mensal' : `A cada ${interval} meses`,
      yearly: interval === 1 ? 'Anual' : `A cada ${interval} anos`,
    };
    return labels[frequency] || frequency;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transações Recorrentes</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {transactions.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Nenhuma transação recorrente"
            description="Configure transações automáticas para receitas e despesas fixas"
            actionText="Criar Transação"
            onAction={() => navigation.navigate('RecurringTransactionForm' as never)}
          />
        ) : (
          transactions.map((item) => (
            <View
              key={item.id}
              style={[
                styles.transactionCard,
                { backgroundColor: colors.card },
                !item.isActive && styles.inactiveCard,
              ]}
            >
              <View style={styles.transactionHeader}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={item.type === 'receita' ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={item.type === 'receita' ? colors.success : colors.error}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {item.categoryName}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.info + '20' }]}>
                      <Text style={[styles.badgeText, { color: colors.info }]}>
                        {getFrequencyLabel(item.frequency, item.interval)}
                      </Text>
                    </View>
                    {!item.isActive && (
                      <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.error }]}>
                          Inativa
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.type === 'receita' ? colors.success : colors.error },
                  ]}
                >
                  {formatCurrency(item.amount)}
                </Text>
              </View>

              <View style={styles.transactionDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Próxima: {formatDate(item.nextExecutionDate)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Execuções: {item.executionCount}
                    {item.maxOccurrences && ` / ${item.maxOccurrences}`}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => handleToggleActive(item.id, item.isActive)}
                >
                  <Ionicons
                    name={item.isActive ? 'pause' : 'play'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    {item.isActive ? 'Pausar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                  onPress={() => handleExecuteNow(item.id)}
                  disabled={!item.isActive}
                >
                  <Ionicons name="play-circle-outline" size={16} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>
                    Executar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
                  onPress={() => (navigation as any).navigate('RecurringTransactionHistory', { id: item.id, description: item.description })}
                >
                  <Ionicons name="time-outline" size={16} color={colors.info} />
                  <Text style={[styles.actionText, { color: colors.info }]}>
                    Histórico
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={[styles.actionText, { color: colors.error }]}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('RecurringTransactionForm' as never)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  transactionCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inactiveCard: {
    opacity: 0.6,
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionDetails: {
    marginBottom: SPACING.md,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    minWidth: '22%',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
