import React, { useCallback, useState, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, StatCard, Loading, Badge } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';
import api from '../../services/api';

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  accountsCount: number;
  transactionsCount: number;
}

interface DashboardScreenProps {
  navigation?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { showError } = useToast();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Buscar dados reais do backend em paralelo
      const [accountsRes, summaryRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions/summary'),
      ]);

      // Extrair dados das respostas
      const accounts = accountsRes.data?.data || accountsRes.data || [];
      const summary = summaryRes.data?.data?.summary || summaryRes.data?.summary || {};

      // Calcular saldo total das contas
      const accountsList = Array.isArray(accounts) ? accounts : [];
      const totalBalance = accountsList.reduce((sum: number, acc: any) => {
        return sum + parseFloat(acc.balance || '0');
      }, 0);

      // Dados do resumo de transações
      const monthlyIncome = summary.totalReceitas || 0;
      const monthlyExpenses = summary.totalDespesas || 0;
      const transactionsCount = summary.transactionCount || 0;

      // Calcular taxa de poupança
      const savingsRate = monthlyIncome > 0 
        ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) 
        : 0;

      setData({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.max(0, savingsRate),
        accountsCount: accountsList.length,
        transactionsCount,
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      // Definir valores padrão em caso de erro
      setData({
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        accountsCount: 0,
        transactionsCount: 0,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carregar dados quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' Kz';
  };

  // Ações rápidas - navegação para telas de formulário
  const quickActions = [
    { icon: 'add-circle', label: 'Receita', color: colors.success, screen: 'AddTransaction', params: { type: 'receita' } },
    { icon: 'remove-circle', label: 'Despesa', color: colors.error, screen: 'AddTransaction', params: { type: 'despesa' } },
    { icon: 'swap-horizontal', label: 'Transferir', color: colors.primary, screen: 'AddTransfer', params: {} },
    { icon: 'flag', label: 'Metas', color: colors.warning, screen: 'SavingsGoals', params: {} },
  ];

  // Menu principal - navegação para telas dentro do DashboardStack
  const menuItems = [
    { icon: 'wallet', label: 'Contas', screen: 'Contas', isTab: true, badge: data?.accountsCount },
    { icon: 'repeat', label: 'Recorrentes', screen: 'RecurringTransactions', isTab: false },
    { icon: 'cash', label: 'Empréstimos', screen: 'Loans', isTab: false },
    { icon: 'card', label: 'Dívidas', screen: 'Debts', isTab: false },
    { icon: 'pricetags', label: 'Categorias', screen: 'Categories', isTab: false },
    { icon: 'download', label: 'Exportar', screen: 'Export', isTab: false },
  ];

  // Navegar para tela ou tab
  const handleMenuNavigation = (item: typeof menuItems[0]) => {
    if (item.isTab) {
      // Navegar para tab
      navigation?.getParent()?.navigate(item.screen);
    } else {
      // Navegar para tela dentro do stack
      navigation?.navigate(item.screen);
    }
  };

  if (isLoading) {
    return <Loading message="Carregando dashboard..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Olá, {user?.firstName || 'Usuário'}! 👋
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Resumo Financeiro
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={toggleTheme}
            >
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation?.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <Card variant="elevated" padding="lg" style={styles.balanceCard}>
          <View style={[styles.balanceCardInner, { backgroundColor: colors.primary }]}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={24} color="#FFFFFF" />
              </View>
              <Badge label={user?.planType?.toUpperCase() || 'BÁSICO'} variant="info" size="sm" />
            </View>
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(data?.totalBalance || 0)}</Text>
            
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Ionicons name="trending-up" size={16} color="#4ADE80" />
                <Text style={styles.balanceStatLabel}>Receitas</Text>
                <Text style={styles.balanceStatValue}>{formatCurrency(data?.monthlyIncome || 0)}</Text>
              </View>
              <View style={[styles.balanceStatDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.balanceStat}>
                <Ionicons name="trending-down" size={16} color="#F87171" />
                <Text style={styles.balanceStatLabel}>Despesas</Text>
                <Text style={styles.balanceStatValue}>{formatCurrency(data?.monthlyExpenses || 0)}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ações Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => navigation?.navigate(action.screen, action.params)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Estatísticas do Mês - NÃO são menus, são apenas informações */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Estatísticas do Mês</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.success}15` }]}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taxa de Poupança</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{data?.savingsRate || 0}%</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="wallet" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Contas</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{data?.accountsCount || 0}</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.info}15` }]}>
              <Ionicons name="list" size={20} color={colors.info} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Transações</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{data?.transactionsCount || 0}</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => handleMenuNavigation(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              </View>
              <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              {item.badge !== undefined && (
                <Badge label={String(item.badge)} variant="primary" size="sm" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Espaço extra no final */}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginBottom: SPACING.lg,
    padding: 0,
  },
  balanceCardInner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.lg,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  balanceStatDivider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.md,
  },
  balanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  balanceStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  menuItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
