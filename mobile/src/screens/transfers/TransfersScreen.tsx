import React, { useState, useEffect, useCallback } from 'react';
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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  fromAccountName?: string;
  fromAccountBank?: string;
  toAccountName?: string;
  toAccountBank?: string;
  amount: string;
  description?: string;
  date: string;
  createdAt?: string;
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
      const response = await api.get('/transfers');
      const data = response.data?.data || response.data;
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransfers();
    }, [])
  );

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
            size="lg"
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
                      {formatRelativeDate(transfer.date || transfer.createdAt || '')}
                    </Text>
                  </View>
                </View>

                <View style={styles.transferDetails}>
                  <View style={styles.accountFlow}>
                    <View style={styles.accountItem}>
                      <Ionicons name="remove-circle" size={16} color={COLORS.error} />
                      <View style={styles.accountTextContainer}>
                        <Text style={styles.fromAccount}>
                          {transfer.fromAccountName || `Conta #${transfer.fromAccountId}`}
                        </Text>
                        {transfer.fromAccountBank && (
                          <Text style={styles.accountBank}>{transfer.fromAccountBank}</Text>
                        )}
                      </View>
                    </View>
                    
                    <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
                    
                    <View style={styles.accountItem}>
                      <Ionicons name="add-circle" size={16} color={COLORS.success} />
                      <View style={styles.accountTextContainer}>
                        <Text style={styles.toAccount}>
                          {transfer.toAccountName || `Conta #${transfer.toAccountId}`}
                        </Text>
                        {transfer.toAccountBank && (
                          <Text style={styles.accountBankRight}>{transfer.toAccountBank}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {transfer.description && (
                    <Text style={styles.transferDescription}>
                      {transfer.description}
                    </Text>
                  )}

                  <Text style={styles.transferFullDate}>
                    {formatDate(transfer.date || transfer.createdAt || '')}
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
    alignItems: 'flex-start',
    flex: 1,
  },
  accountTextContainer: {
    marginLeft: SPACING.xs,
    flex: 1,
  },
  fromAccount: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  toAccount: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
    textAlign: 'right',
  },
  accountBank: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accountBankRight: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
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