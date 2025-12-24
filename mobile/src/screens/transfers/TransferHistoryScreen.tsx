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
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
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
  date?: string;
  createdAt?: string;
}

interface TransferHistoryScreenProps {
  navigation: any;
  route: any;
}

export const TransferHistoryScreen: React.FC<TransferHistoryScreenProps> = ({ navigation, route }) => {
  const { accountId, accountName } = route.params || {};
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchTransferHistory = async () => {
    try {
      const response = await api.get(`/transfers/account/${accountId}`);
      const data = response.data?.data || response.data;
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar histórico de transferências:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (accountId) {
        fetchTransferHistory();
      }
    }, [accountId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransferHistory();
  };

  const getTransferDirection = (transfer: Transfer) => {
    if (transfer.fromAccountId === accountId) {
      return 'out'; // Saída
    }
    return 'in'; // Entrada
  };

  if (loading) {
    return <Loading message="Carregando histórico..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Histórico</Text>
          {accountName && (
            <Text style={styles.subtitle}>{accountName}</Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {transfers.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title="Nenhuma transferência"
            description="Esta conta ainda não possui histórico de transferências"
            actionLabel="Fazer Transferência"
            onAction={() => navigation.navigate('AddTransfer', { fromAccountId: accountId })}
          />
        ) : (
          <View style={styles.transfersList}>
            {transfers.map((transfer) => {
              const direction = getTransferDirection(transfer);
              const isOutgoing = direction === 'out';
              
              return (
                <Card key={transfer.id} style={styles.transferCard}>
                  <View style={styles.transferHeader}>
                    <View style={[
                      styles.transferIcon,
                      { backgroundColor: isOutgoing ? `${COLORS.error}15` : `${COLORS.success}15` }
                    ]}>
                      <Ionicons
                        name={isOutgoing ? 'arrow-up' : 'arrow-down'}
                        size={24}
                        color={isOutgoing ? COLORS.error : COLORS.success}
                      />
                    </View>
                    <View style={styles.transferInfo}>
                      <Text style={[
                        styles.transferAmount,
                        { color: isOutgoing ? COLORS.error : COLORS.success }
                      ]}>
                        {isOutgoing ? '-' : '+'}{formatCurrency(parseFloat(transfer.amount))}
                      </Text>
                      <Text style={styles.transferDate}>
                        {formatRelativeDate(transfer.date || transfer.createdAt || '')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transferDetails}>
                    <View style={styles.accountFlow}>
                      {isOutgoing ? (
                        <View style={styles.flowContent}>
                          <Text style={styles.flowLabel}>Para:</Text>
                          <View style={styles.flowAccountInfo}>
                            <Text style={styles.flowAccount}>
                              {transfer.toAccountName || `Conta #${transfer.toAccountId}`}
                            </Text>
                            {transfer.toAccountBank && (
                              <Text style={styles.flowBank}>{transfer.toAccountBank}</Text>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={styles.flowContent}>
                          <Text style={styles.flowLabel}>De:</Text>
                          <View style={styles.flowAccountInfo}>
                            <Text style={styles.flowAccount}>
                              {transfer.fromAccountName || `Conta #${transfer.fromAccountId}`}
                            </Text>
                            {transfer.fromAccountBank && (
                              <Text style={styles.flowBank}>{transfer.fromAccountBank}</Text>
                            )}
                          </View>
                        </View>
                      )}
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  transfersList: {
    gap: SPACING.md,
  },
  transferCard: {
    marginBottom: 0,
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
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  flowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  flowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  flowAccountInfo: {
    flex: 1,
  },
  flowAccount: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  flowBank: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
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
