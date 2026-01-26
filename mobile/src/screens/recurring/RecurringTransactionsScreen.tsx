import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import recurringTransactionsService, { RecurringTransaction } from '../../services/recurring-transactions.service';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

export function RecurringTransactionsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
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

  const renderTransaction = ({ item }: { item: RecurringTransaction }) => (
    <View
      style={[
        styles.transactionCard,
        { backgroundColor: theme.colors.card },
        !item.isActive && styles.inactiveCard,
      ]}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={item.type === 'receita' ? 'trending-up' : 'trending-down'}
            size={24}
            color={item.type === 'receita' ? theme.colors.success : theme.colors.error}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>
            {item.description}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {item.categoryName}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.info + '20' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.info }]}>
                {getFrequencyLabel(item.frequency, item.interval)}
              </Text>
            </View>
            {!item.isActive && (
              <View style={[styles.badge, { backgroundColor: theme.colors.error + '20' }]}>
                <Text style={[styles.badgeText, { color: theme.colors.error }]}>
                  Inativa
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'receita' ? theme.colors.success : theme.colors.error },
          ]}
        >
          {formatCurrency(item.amount)}
        </Text>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Próxima: {formatDate(item.nextExecutionDate)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="repeat-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Execuções: {item.executionCount}
            {item.maxOccurrences && ` / ${item.maxOccurrences}`}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => handleToggleActive(item.id, item.isActive)}
        >
          <Ionicons
            name={item.isActive ? 'pause' : 'play'}
            size={16}
            color={theme.colors.primary}
          />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>
            {item.isActive ? 'Pausar' : 'Ativar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.success + '20' }]}
          onPress={() => handleExecuteNow(item.id)}
          disabled={!item.isActive}
        >
          <Ionicons name="play-circle-outline" size={16} color={theme.colors.success} />
          <Text style={[styles.actionText, { color: theme.colors.success }]}>
            Executar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
          <Text style={[styles.actionText, { color: theme.colors.error }]}>
            Excluir
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="Nenhuma transação recorrente"
            description="Configure transações automáticas para receitas e despesas fixas"
            actionText="Criar Transação"
            onAction={() => navigation.navigate('RecurringTransactionForm' as never)}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('RecurringTransactionForm' as never)}
      >
        <Ionicons name="add" size={24} color="#fff" />
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
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    marginBottom: 12,
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
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
