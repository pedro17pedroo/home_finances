import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Loading, Badge } from '../../components/ui';
import { useCurrency } from '../../hooks/useCurrency';
import { SPACING, COLORS } from '../../constants/config';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CategoryExpense {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  transactionCount: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface AccountBalance {
  id: number;
  name: string;
  balance: number;
  type: string;
  percentage: number;
}

interface ReportData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  transactionCount: number;
  avgTransactionValue: number;
  categoryExpenses: CategoryExpense[];
  monthlyTrend: MonthlyData[];
  accountBalances: AccountBalance[];
  topExpenseCategory: string;
  topIncomeCategory: string;
  dailyAvgExpense: number;
  projectedMonthlyExpense: number;
}

interface ReportsScreenProps {
  navigation?: any;
}

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const fetchReportData = async () => {
    try {
      const [accountsRes, transactionsRes, categoriesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions'),
        api.get('/categories'),
      ]);

      const accounts = accountsRes.data?.data || accountsRes.data || [];
      const transactionsData = transactionsRes.data?.data?.transactions || 
                               transactionsRes.data?.transactions || 
                               transactionsRes.data?.data || [];
      const categories = categoriesRes.data?.data || categoriesRes.data || [];

      const accountsList = Array.isArray(accounts) ? accounts : [];
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      const categoriesList = Array.isArray(categories) ? categories : [];

      // Calcular saldo total
      const totalBalance = accountsList.reduce((sum: number, acc: any) => 
        sum + parseFloat(acc.balance || '0'), 0);

      // Filtrar transações do período
      const now = new Date();
      const periodStart = new Date();
      if (period === 'week') periodStart.setDate(now.getDate() - 7);
      else if (period === 'month') periodStart.setMonth(now.getMonth() - 1);
      else periodStart.setFullYear(now.getFullYear() - 1);

      const filteredTransactions = transactions.filter((t: any) => 
        new Date(t.date) >= periodStart);

      // Calcular receitas e despesas
      let monthlyIncome = 0, monthlyExpenses = 0;
      const categoryMap = new Map<string, { amount: number; count: number }>();
      const incomeByCategory = new Map<string, number>();

      filteredTransactions.forEach((t: any) => {
        const amount = parseFloat(t.amount || '0');
        const category = typeof t.category === 'object' ? t.category?.name : t.category || 'Outros';
        
        if (t.type === 'receita') {
          monthlyIncome += amount;
          incomeByCategory.set(category, (incomeByCategory.get(category) || 0) + amount);
        } else {
          monthlyExpenses += amount;
          const existing = categoryMap.get(category) || { amount: 0, count: 0 };
          categoryMap.set(category, { 
            amount: existing.amount + amount, 
            count: existing.count + 1 
          });
        }
      });

      // Despesas por categoria
      const categoryExpenses: CategoryExpense[] = Array.from(categoryMap.entries())
        .map(([name, data], index) => ({
          name,
          amount: data.amount,
          percentage: monthlyExpenses > 0 ? Math.round((data.amount / monthlyExpenses) * 100) : 0,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          transactionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      // Saldos por conta
      const accountBalances: AccountBalance[] = accountsList.map((acc: any, index: number) => ({
        id: acc.id,
        name: acc.name,
        balance: parseFloat(acc.balance || '0'),
        type: acc.type,
        percentage: totalBalance > 0 ? Math.round((parseFloat(acc.balance || '0') / totalBalance) * 100) : 0,
      }));

      // Tendência mensal (últimos 6 meses)
      const monthlyTrend: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthTransactions = transactions.filter((t: any) => {
          const date = new Date(t.date);
          return date >= monthStart && date <= monthEnd;
        });

        let income = 0, expense = 0;
        monthTransactions.forEach((t: any) => {
          const amount = parseFloat(t.amount || '0');
          if (t.type === 'receita') income += amount;
          else expense += amount;
        });

        monthlyTrend.push({
          month: monthDate.toLocaleDateString('pt-AO', { month: 'short' }),
          income,
          expense,
          balance: income - expense,
        });
      }

      // KPIs
      const savingsRate = monthlyIncome > 0 
        ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
      const transactionCount = filteredTransactions.length;
      const avgTransactionValue = transactionCount > 0 
        ? (monthlyIncome + monthlyExpenses) / transactionCount : 0;
      const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const dailyAvgExpense = daysInPeriod > 0 ? monthlyExpenses / daysInPeriod : 0;
      const projectedMonthlyExpense = dailyAvgExpense * 30;

      const topExpenseCategory = categoryExpenses[0]?.name || 'N/A';
      const topIncomeCategory = Array.from(incomeByCategory.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      setData({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.max(0, savingsRate),
        transactionCount,
        avgTransactionValue,
        categoryExpenses,
        monthlyTrend,
        accountBalances,
        topExpenseCategory,
        topIncomeCategory,
        dailyAvgExpense,
        projectedMonthlyExpense,
      });
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchReportData(); }, [period]));
  const onRefresh = () => { setRefreshing(true); fetchReportData(); };

  if (loading) return <Loading message="Carregando relatórios..." />;

  const netBalance = (data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0);
  const maxTrendValue = Math.max(...(data?.monthlyTrend || []).map(m => Math.max(m.income, m.expense)), 1);

  // Gerar insights dinâmicos
  const insights: { icon: string; color: string; text: string }[] = [];
  if (data) {
    if (data.savingsRate >= 20) {
      insights.push({ icon: 'checkmark-circle', color: COLORS.success, 
        text: `Excelente! Você está poupando ${data.savingsRate}% da sua renda` });
    } else if (data.savingsRate > 0) {
      insights.push({ icon: 'alert-circle', color: COLORS.warning, 
        text: `Você está poupando apenas ${data.savingsRate}%. Tente aumentar para 20%` });
    } else {
      insights.push({ icon: 'close-circle', color: COLORS.error, 
        text: 'Suas despesas excedem suas receitas. Revise seus gastos!' });
    }
    
    if (data.categoryExpenses[0]) {
      insights.push({ icon: 'pie-chart', color: COLORS.info, 
        text: `${data.topExpenseCategory} representa ${data.categoryExpenses[0].percentage}% das despesas` });
    }
    
    if (data.projectedMonthlyExpense > data.monthlyIncome && data.monthlyIncome > 0) {
      insights.push({ icon: 'warning', color: COLORS.error, 
        text: `Projeção de gastos (${formatCurrency(data.projectedMonthlyExpense)}) excede sua renda` });
    }
    
    if (data.dailyAvgExpense > 0) {
      insights.push({ icon: 'calendar', color: COLORS.primary, 
        text: `Média diária de gastos: ${formatCurrency(data.dailyAvgExpense)}` });
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Relatórios</Text>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.navigate('Export')}
        >
          <Ionicons name="download-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.periodSelector, { backgroundColor: colors.surfaceSecondary }]}>
        {(['week', 'month', 'year'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && { backgroundColor: colors.surface }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: period === p ? colors.text : colors.textSecondary }]}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Saldo Total */}
        <Card variant="elevated" padding="lg" style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={24} color="#FFFFFF" />
            <Text style={styles.balanceLabel}>Saldo Total</Text>
          </View>
          <Text style={styles.balanceValue}>{formatCurrency(data?.totalBalance || 0)}</Text>
          <Text style={styles.balanceSubtext}>{data?.accountBalances.length || 0} conta(s)</Text>
        </Card>

        {/* KPIs Row */}
        <View style={styles.kpiRow}>
          <Card variant="default" padding="md" style={styles.kpiCard}>
            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            <Text style={[styles.kpiValue, { color: colors.text }]}>{data?.transactionCount || 0}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Transações</Text>
          </Card>
          <Card variant="default" padding="md" style={styles.kpiCard}>
            <Ionicons name="calculator" size={20} color={colors.warning} />
            <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(data?.avgTransactionValue || 0)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Média/Trans.</Text>
          </Card>
          <Card variant="default" padding="md" style={styles.kpiCard}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
            <Text style={[styles.kpiValue, { color: colors.text }]}>{data?.savingsRate || 0}%</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Poupança</Text>
          </Card>
        </View>

        {/* Receitas vs Despesas */}
        <View style={styles.statsRow}>
          <Card variant="elevated" padding="md" style={styles.statCardSuccess}>
            <Ionicons name="trending-up" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Receitas</Text>
            <Text style={styles.statValue}>{formatCurrency(data?.monthlyIncome || 0)}</Text>
          </Card>
          <Card variant="elevated" padding="md" style={styles.statCardError}>
            <Ionicons name="trending-down" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Despesas</Text>
            <Text style={styles.statValue}>{formatCurrency(data?.monthlyExpenses || 0)}</Text>
          </Card>
        </View>

        {/* Balanço do Período */}
        <Card variant="default" padding="lg" style={styles.netCard}>
          <View style={styles.netHeader}>
            <Text style={[styles.netTitle, { color: colors.text }]}>Balanço do Período</Text>
            <Badge variant={netBalance >= 0 ? 'success' : 'error'} label={netBalance >= 0 ? 'Positivo' : 'Negativo'} />
          </View>
          <Text style={[styles.netValue, { color: netBalance >= 0 ? colors.success : colors.error }]}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
          </Text>
          <View style={styles.netDetails}>
            <View style={styles.netDetailItem}>
              <Text style={[styles.netDetailLabel, { color: colors.textSecondary }]}>Média Diária</Text>
              <Text style={[styles.netDetailValue, { color: colors.text }]}>{formatCurrency(data?.dailyAvgExpense || 0)}</Text>
            </View>
            <View style={styles.netDetailItem}>
              <Text style={[styles.netDetailLabel, { color: colors.textSecondary }]}>Projeção Mensal</Text>
              <Text style={[styles.netDetailValue, { color: colors.text }]}>{formatCurrency(data?.projectedMonthlyExpense || 0)}</Text>
            </View>
          </View>
        </Card>

        {/* Gráfico de Tendência */}
        {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
          <Card variant="default" padding="lg" style={styles.chartCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolução Mensal</Text>
            <View style={styles.chartContainer}>
              {data.monthlyTrend.map((month, index) => (
                <View key={index} style={styles.chartColumn}>
                  <View style={styles.chartBars}>
                    <View style={[styles.chartBar, styles.chartBarIncome, 
                      { height: `${(month.income / maxTrendValue) * 100}%` }]} />
                    <View style={[styles.chartBar, styles.chartBarExpense, 
                      { height: `${(month.expense / maxTrendValue) * 100}%` }]} />
                  </View>
                  <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>{month.month}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Receitas</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Despesas</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Despesas por Categoria - Gráfico de Pizza Simplificado */}
        {data?.categoryExpenses && data.categoryExpenses.length > 0 && (
          <Card variant="default" padding="lg" style={styles.categoryCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Despesas por Categoria</Text>
            
            {/* Barra de proporção */}
            <View style={styles.proportionBar}>
              {data.categoryExpenses.map((cat, index) => (
                <View key={cat.name} style={[styles.proportionSegment, 
                  { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
              ))}
            </View>

            {/* Lista de categorias */}
            {data.categoryExpenses.map((category) => (
              <View key={category.name} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                      {category.transactionCount} transações
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatCurrency(category.amount)}</Text>
                  <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>{category.percentage}%</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Distribuição por Conta */}
        {data?.accountBalances && data.accountBalances.length > 0 && (
          <Card variant="default" padding="lg" style={styles.accountsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Distribuição por Conta</Text>
            {data.accountBalances.map((account) => (
              <View key={account.id} style={styles.accountItem}>
                <View style={styles.accountLeft}>
                  <Ionicons 
                    name={account.type === 'poupanca' ? 'library' : 'card'} 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                </View>
                <View style={styles.accountRight}>
                  <Text style={[styles.accountBalance, { color: colors.text }]}>
                    {formatCurrency(account.balance)}
                  </Text>
                  <Text style={[styles.accountPercent, { color: colors.textSecondary }]}>
                    {account.percentage}%
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Insights */}
        <Card variant="outlined" padding="lg" style={{...styles.insightsCard, borderColor: colors.primary}}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={20} color={colors.primary} />
            <Text style={[styles.insightsTitle, { color: colors.text }]}>Insights Financeiros</Text>
          </View>
          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Ionicons name={insight.icon as any} size={18} color={insight.color} />
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>{insight.text}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Resumo Rápido */}
        <Card variant="default" padding="lg" style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo Rápido</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Maior Despesa</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>{data?.topExpenseCategory || 'N/A'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Maior Receita</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{data?.topIncomeCategory || 'N/A'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Transações</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{data?.transactionCount || 0}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Taxa Poupança</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{data?.savingsRate || 0}%</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: '700' },
  exportButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  periodSelector: { flexDirection: 'row', marginHorizontal: SPACING.md, borderRadius: 8, padding: 4, marginBottom: SPACING.md },
  periodButton: { flex: 1, paddingVertical: SPACING.sm, borderRadius: 6, alignItems: 'center' },
  periodText: { fontSize: 13, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md },
  
  // Balance Card
  balanceCard: { marginBottom: SPACING.md, backgroundColor: '#2563EB' },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: SPACING.sm },
  balanceValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  balanceSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // KPI Row
  kpiRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  kpiValue: { fontSize: 14, fontWeight: '700', marginTop: SPACING.xs },
  kpiLabel: { fontSize: 10, marginTop: 2 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCardSuccess: { flex: 1, alignItems: 'center', backgroundColor: '#10B981' },
  statCardError: { flex: 1, alignItems: 'center', backgroundColor: '#EF4444' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  statValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  // Net Card
  netCard: { marginBottom: SPACING.md },
  netHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  netTitle: { fontSize: 16, fontWeight: '600' },
  netValue: { fontSize: 24, fontWeight: '700', marginBottom: SPACING.md },
  netDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  netDetailItem: { flex: 1 },
  netDetailLabel: { fontSize: 11 },
  netDetailValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Chart Card
  chartCard: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 120, marginBottom: SPACING.sm },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' },
  chartBar: { width: 12, borderRadius: 4 },
  chartBarIncome: { backgroundColor: '#10B981' },
  chartBarExpense: { backgroundColor: '#EF4444' },
  chartLabel: { fontSize: 10, marginTop: 4 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { fontSize: 11 },

  // Category Card
  categoryCard: { marginBottom: SPACING.md },
  proportionBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: SPACING.md },
  proportionSegment: { height: '100%' },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: SPACING.sm },
  categoryName: { fontSize: 14, fontWeight: '500' },
  categoryCount: { fontSize: 11, marginTop: 2 },
  categoryRight: { alignItems: 'flex-end' },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  categoryPercent: { fontSize: 11, marginTop: 2 },

  // Accounts Card
  accountsCard: { marginBottom: SPACING.md },
  accountItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  accountLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  accountName: { fontSize: 14, fontWeight: '500', marginLeft: SPACING.sm },
  accountRight: { alignItems: 'flex-end' },
  accountBalance: { fontSize: 14, fontWeight: '600' },
  accountPercent: { fontSize: 11, marginTop: 2 },

  // Insights Card
  insightsCard: { marginBottom: SPACING.md },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  insightsTitle: { fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm },
  insightsList: { gap: SPACING.sm },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start' },
  insightText: { fontSize: 13, marginLeft: SPACING.sm, flex: 1, lineHeight: 18 },

  // Summary Card
  summaryCard: { marginBottom: SPACING.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem: { width: '50%', paddingVertical: SPACING.sm },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
