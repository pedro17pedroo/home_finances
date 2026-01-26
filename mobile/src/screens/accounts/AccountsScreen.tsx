import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, Button, Loading, EmptyState, Badge } from '../../components/ui';
import { Account } from '../../types';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface AccountsScreenProps {
  navigation?: any;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data?.data || response.data;
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz';
  };

  const getAccountIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'poupanca': return 'library';
      case 'investimento': return 'trending-up';
      case 'carteira': return 'wallet';
      default: return 'card';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      corrente: 'Conta Corrente',
      poupanca: 'Poupança',
      investimento: 'Investimento',
      carteira: 'Carteira',
      outro: 'Outro',
    };
    return labels[type] || type;
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => {
      return total + parseFloat(account.balance || '0');
    }, 0);
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Eliminar Conta',
      `Tem certeza que deseja eliminar "${account.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/accounts/${account.id}`);
              showSuccess('Conta eliminada com sucesso');
              fetchAccounts();
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao eliminar conta');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Carregando contas..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Minhas Contas</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation?.navigate('AddAccount', {})}
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
        {/* Saldo Total */}
        <Card variant="elevated" padding="lg" style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Ionicons name="wallet" size={24} color="#FFFFFF" />
            <Text style={styles.totalLabel}>Saldo Total</Text>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(getTotalBalance())}</Text>
          <Text style={styles.totalAccounts}>{accounts.length} conta(s)</Text>
        </Card>

        {/* Ações Rápidas */}
        {accounts.length > 0 && (
          <View style={styles.quickActions}>
            <Button
              title="Ver Todas Transferências"
              onPress={() => navigation?.navigate('Transfers')}
              variant="outline"
              fullWidth
              size="md"
              icon="swap-horizontal-outline"
            />
          </View>
        )}

        {/* Lista de Contas */}
        {accounts.length > 0 ? (
          <View style={styles.accountsList}>
            {accounts.map((account) => (
              <Card key={account.id} variant="default" padding="md" style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountInfo}>
                    <View style={[styles.accountIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                      <Ionicons
                        name={getAccountIcon(account.type)}
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.accountDetails}>
                      <Text style={[styles.accountName, { color: colors.text }]}>
                        {account.name}
                      </Text>
                      {(account.bankName || account.bank) && (
                        <Text style={[styles.accountBank, { color: colors.textSecondary }]}>
                          {account.bankName || account.bank}
                        </Text>
                      )}
                      <Badge
                        label={getAccountTypeLabel(account.type)}
                        variant="info"
                        size="sm"
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => {
                      Alert.alert(
                        account.name,
                        'Escolha uma opção',
                        [
                          { text: 'Editar', onPress: () => navigation?.navigate('AddAccount', { account }) },
                          { text: 'Eliminar', onPress: () => handleDeleteAccount(account), style: 'destructive' },
                          { text: 'Cancelar', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.accountBalance}>
                  <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Saldo</Text>
                  <Text style={[styles.balanceAmount, { color: colors.text }]}>
                    {formatCurrency(account.balance)}
                  </Text>
                </View>

                <View style={styles.accountActions}>
                  <Button
                    title="Transferir"
                    onPress={() => navigation?.navigate('AddTransfer', { fromAccountId: account.id })}
                    variant="outline"
                    size="sm"
                    icon="swap-horizontal-outline"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Histórico"
                    onPress={() => navigation?.navigate('TransferHistory', { accountId: account.id, accountName: account.name })}
                    variant="outline"
                    size="sm"
                    icon="time-outline"
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="Nenhuma conta"
            description="Adicione sua primeira conta para começar a controlar suas finanças"
            actionLabel="Adicionar Conta"
            onAction={() => navigation?.navigate('AddAccount', {})}
          />
        )}

        {accounts.length > 0 && (
          <View style={styles.addAccountContainer}>
            <Button
              title="Adicionar Nova Conta"
              onPress={() => navigation?.navigate('AddAccount', {})}
              variant="outline"
              fullWidth
              size="lg"
              icon="add-circle-outline"
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
  totalCard: {
    marginBottom: SPACING.lg,
    backgroundColor: '#2563EB',
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: SPACING.sm,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalAccounts: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: SPACING.xs,
  },
  quickActions: {
    marginBottom: SPACING.lg,
  },
  accountsList: {
    gap: SPACING.md,
  },
  accountCard: {
    marginBottom: 0,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  accountInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  accountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  accountDetails: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountBank: {
    fontSize: 12,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  accountBalance: {
    marginBottom: SPACING.md,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  accountActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addAccountContainer: {
    marginTop: SPACING.lg,
  },
});
