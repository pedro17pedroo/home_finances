import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accountsCount: number;
  transactionsCount: number;
  loansCount: number;
  debtsCount: number;
}

interface DashboardScreenProps {
  navigation?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Simular dados do dashboard
      const mockData: DashboardData = {
        totalBalance: 650000,
        monthlyIncome: 150000,
        monthlyExpenses: 85000,
        accountsCount: 3,
        transactionsCount: 45,
        loansCount: 2,
        debtsCount: 1,
      };
      setData(mockData);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <Loading message="Carregando dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {user?.firstName}!</Text>
          <Text style={styles.subtitle}>Resumo das suas finanças</Text>
        </View>

        {/* Saldo Total */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Saldo Total</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(data?.totalBalance || 0)}
          </Text>
        </Card>

        {/* Resumo Mensal */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up" size={20} color={COLORS.success} />
              <Text style={styles.summaryLabel}>Receitas</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {formatCurrency(data?.monthlyIncome || 0)}
              </Text>
            </View>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-down" size={20} color={COLORS.error} />
              <Text style={styles.summaryLabel}>Despesas</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                {formatCurrency(data?.monthlyExpenses || 0)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Ações Rápidas */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsGrid}>
          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('AddTransaction', { type: 'receita' })}
          >
            <Ionicons name="add-circle" size={32} color={COLORS.success} />
            <Text style={styles.actionText}>Nova Receita</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('AddTransaction', { type: 'despesa' })}
          >
            <Ionicons name="remove-circle" size={32} color={COLORS.error} />
            <Text style={styles.actionText}>Nova Despesa</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('AddTransfer')}
          >
            <Ionicons name="swap-horizontal" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Transferir</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('SavingsGoals')}
          >
            <Ionicons name="flag" size={32} color={COLORS.warning} />
            <Text style={styles.actionText}>Metas</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('Loans')}
          >
            <Ionicons name="cash" size={32} color={COLORS.success} />
            <Text style={styles.actionText}>Empréstimos</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('Debts')}
          >
            <Ionicons name="card" size={32} color={COLORS.error} />
            <Text style={styles.actionText}>Dívidas</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={32} color={COLORS.info} />
            <Text style={styles.actionText}>Notificações</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('RecurringTransactions')}
          >
            <Ionicons name="repeat" size={32} color={COLORS.secondary} />
            <Text style={styles.actionText}>Recorrentes</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('Categories')}
          >
            <Ionicons name="pricetags" size={32} color={COLORS.warning} />
            <Text style={styles.actionText}>Categorias</Text>
          </Card>

          <Card 
            style={styles.actionCard}
            onPress={() => navigation?.navigate('Export')}
          >
            <Ionicons name="download" size={32} color={COLORS.info} />
            <Text style={styles.actionText}>Exportar</Text>
          </Card>
        </View>

        {/* Estatísticas */}
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Contas"
            value={data?.accountsCount || 0}
            icon="wallet"
            color={COLORS.primary}
          />

          <StatCard
            title="Transações"
            value={data?.transactionsCount || 0}
            icon="list"
            color={COLORS.secondary}
          />

          <StatCard
            title="Empréstimos"
            value={data?.loansCount || 0}
            icon="cash"
            color={COLORS.success}
            onPress={() => navigation?.navigate('Loans')}
          />

          <StatCard
            title="Dívidas"
            value={data?.debtsCount || 0}
            icon="card"
            color={COLORS.error}
            onPress={() => navigation?.navigate('Debts')}
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  balanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});