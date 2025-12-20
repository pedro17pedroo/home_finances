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

interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  fromAccountName: string;
  toAccountName: string;
  amount: string;
  description?: string;
  date: string;
  userId: number;
}

interface TransfersScreenProps {
  navigation: any;
}

export const TransfersScreen: React.FC<TransfersScreenProps> = ({ navigation }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchTransfers = async () => {
    try {
      // Simular dados de transferências
      const mockTransfers: Transfer[] = [
        {
          id: 1,
          fromAccountId: 1,
          toAccountId: 2,
          fromAccountName: 'Conta Corrente BAI',
          toAccountName: 'Conta Poupança BFA',
          amount: '50000.00',
          description: 'Poupança mensal',
          date: '2024-12-18T10:00:00Z',
          userId: 1,
        },
        {
          id: 2,
          fromAccountId: 2,
          toAccountId: 1,
          fromAccountName: 'Conta Poupança BFA',
          toAccountName: 'Conta Corrente BAI',
          amount: '25000.00',
          description: 'Emergência',
          date: '2024-12-15T14:30:00Z',
          userId: 1,
        },
        {
          id: 3,
          fromAccountId: 1,
          toAccountId: 3,
          fromAccountName: 'Conta Corrente BAI',
          toAccountName: 'Conta Salário BIC',
          amount: '15000.00',
          description: 'Transferência para salário',
          date: '2024-12-12T09:15:00Z',
          userId: 1,
        },
      ];
      setTransfers(mockTransfers);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransfers();
  };

  const getTotalTransferred = () => {
    return transfers.reduce((total, transfer) => {
      return total + parseFloat(transfer.amount);
    }, 0);
  };

  const getMonthlyTransfers = () => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    return transfers.filter(transfer => 
      new Date(transfer.date) >= thisMonth
    ).length;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando transferências...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transferências</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransfer')}
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
            title="Total Transferido"
            value={formatCurrency(getTotalTransferred())}
            icon="swap-horizontal"
            color={COLORS.primary}
          />
          <StatCard
            title="Este Mês"
            value={getMonthlyTransfers()}
            icon="calendar"
            color={COLORS.secondary}
            subtitle="transferências"
          />
        </View>

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Nova Transferência"
            onPress={() => navigation.navigate('AddTransfer')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Lista de Transferências */}
        <View style={styles.transfersList}>
          <Text style={styles.sectionTitle}>Histórico de Transferências</Text>
          
          {transfers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="swap-horizontal" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma transferência</Text>
              <Text style={styles.emptySubtitle}>
                Você ainda não fez nenhuma transferência entre contas
              </Text>
              <Button
                title="Fazer Primeira Transferência"
                onPress={() => navigation.navigate('AddTransfer')}
                variant="outline"
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            transfers.map((transfer) => (
              <Card key={transfer.id} style={styles.transferCard}>
                <View style={styles.transferHeader}>
                  <View style={styles.transferIcon}>
                    <Ionicons
                      name="swap-horizontal"
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.transferInfo}>
                    <Text style={styles.transferAmount}>
                      {formatCurrency(parseFloat(transfer.amount))}
                    </Text>
                    <Text style={styles.transferDate}>
                      {formatRelativeDate(transfer.date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transferDetails}>
                  <View style={styles.accountFlow}>
                    <View style={styles.accountItem}>
                      <Ionicons name="remove-circle" size={16} color={COLORS.error} />
                      <Text style={styles.fromAccount}>{transfer.fromAccountName}</Text>
                    </View>
                    
                    <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
                    
                    <View style={styles.accountItem}>
                      <Ionicons name="add-circle" size={16} color={COLORS.success} />
                      <Text style={styles.toAccount}>{transfer.toAccountName}</Text>
                    </View>
                  </View>

                  {transfer.description && (
                    <Text style={styles.transferDescription}>
                      {transfer.description}
                    </Text>
                  )}

                  <Text style={styles.transferFullDate}>
                    {formatDate(transfer.date)}
                  </Text>
                </View>
              </Card>
            ))
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
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  transfersList: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
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
  emptyButton: {
    marginTop: SPACING.sm,
  },
  transferCard: {
    marginBottom: SPACING.md,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  transferIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  transferInfo: {
    flex: 1,
  },
  transferAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  transferDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transferDetails: {
    gap: SPACING.sm,
  },
  accountFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fromAccount: {
    fontSize: 12,
    color: COLORS.error,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  toAccount: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: SPACING.xs,
    flex: 1,
    textAlign: 'right',
  },
  transferDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  transferFullDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});