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
import { Account } from '../../types';
import { COLORS, SPACING } from '../../constants/config';

export const AccountsScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccounts = async () => {
    try {
      // Simular dados das contas
      const mockAccounts: Account[] = [
        {
          id: 1,
          name: 'Conta Corrente BAI',
          type: 'corrente',
          bank: 'Banco Angolano de Investimentos',
          balance: '150000.00',
          userId: 1,
        },
        {
          id: 2,
          name: 'Conta Poupança BFA',
          type: 'poupanca',
          bank: 'Banco de Fomento Angola',
          balance: '500000.00',
          userId: 1,
        },
        {
          id: 3,
          name: 'Conta Salário BIC',
          type: 'corrente',
          bank: 'Banco BIC',
          balance: '75000.00',
          userId: 1,
        },
      ];
      setAccounts(mockAccounts);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(value));
  };

  const getAccountIcon = (type: string) => {
    return type === 'poupanca' ? 'library' : 'card';
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => {
      return total + parseFloat(account.balance);
    }, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando contas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Contas</Text>
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
        {/* Saldo Total */}
        <Card style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.totalLabel}>Saldo Total</Text>
          </View>
          <Text style={styles.totalAmount}>
            {formatCurrency(getTotalBalance().toString())}
          </Text>
        </Card>

        {/* Lista de Contas */}
        <View style={styles.accountsList}>
          {accounts.map((account) => (
            <Card key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountInfo}>
                  <View style={styles.accountIconContainer}>
                    <Ionicons
                      name={getAccountIcon(account.type)}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountBank}>{account.bank}</Text>
                    <Text style={styles.accountType}>
                      {account.type === 'corrente' ? 'Conta Corrente' : 'Poupança'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.accountBalance}>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>

              <View style={styles.accountActions}>
                <Button
                  title="Transferir"
                  onPress={() => {}}
                  variant="outline"
                  size="small"
                />
                <Button
                  title="Histórico"
                  onPress={() => {}}
                  variant="outline"
                  size="small"
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Botão Adicionar Conta */}
        <View style={styles.addAccountContainer}>
          <Button
            title="Adicionar Nova Conta"
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
  totalCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
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
    color: 'white',
  },
  accountsList: {
    paddingHorizontal: SPACING.lg,
  },
  accountCard: {
    marginBottom: SPACING.md,
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
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  accountBank: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  accountType: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  moreButton: {
    padding: SPACING.xs,
  },
  accountBalance: {
    marginBottom: SPACING.md,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'right',
  },
  accountActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addAccountContainer: {
    padding: SPACING.lg,
  },
});