import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING } from '../../constants/config';

const screenWidth = Dimensions.get('window').width;

interface ReportData {
  monthlyExpenses: number[];
  monthlyIncome: number[];
  categoryExpenses: { name: string; amount: number; color: string }[];
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

export const ReportsScreen: React.FC = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportData = async () => {
    try {
      // Simular dados de relatório
      const mockData: ReportData = {
        monthlyExpenses: [45000, 52000, 38000, 65000, 48000, 55000],
        monthlyIncome: [120000, 125000, 110000, 130000, 115000, 140000],
        categoryExpenses: [
          { name: 'Alimentação', amount: 35000, color: '#FF6384' },
          { name: 'Transporte', amount: 25000, color: '#36A2EB' },
          { name: 'Lazer', amount: 15000, color: '#FFCE56' },
          { name: 'Saúde', amount: 20000, color: '#4BC0C0' },
          { name: 'Outros', amount: 10000, color: '#9966FF' },
        ],
        balance: 650000,
        totalIncome: 750000,
        totalExpenses: 105000,
      };
      setData(mockData);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
  };

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando relatórios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Financeiro */}
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="wallet" size={24} color="white" />
            <Text style={styles.summaryLabel}>Saldo Atual</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data?.balance || 0)}
            </Text>
          </Card>

          <View style={styles.summaryRow}>
            <Card style={[styles.summaryCardSmall, { backgroundColor: COLORS.success }]}>
              <Ionicons name="trending-up" size={20} color="white" />
              <Text style={styles.summaryLabelSmall}>Receitas</Text>
              <Text style={styles.summaryValueSmall}>
                {formatCurrency(data?.totalIncome || 0)}
              </Text>
            </Card>

            <Card style={[styles.summaryCardSmall, { backgroundColor: COLORS.error }]}>
              <Ionicons name="trending-down" size={20} color="white" />
              <Text style={styles.summaryLabelSmall}>Despesas</Text>
              <Text style={styles.summaryValueSmall}>
                {formatCurrency(data?.totalExpenses || 0)}
              </Text>
            </Card>
          </View>
        </View>

        {/* Gráfico de Evolução Mensal */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolução Mensal</Text>
          <LineChart
            data={{
              labels: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
              datasets: [
                {
                  data: data?.monthlyIncome || [],
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: data?.monthlyExpenses || [],
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
              legend: ['Receitas', 'Despesas'],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Card>

        {/* Gráfico de Despesas por Categoria */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Despesas por Categoria</Text>
          <PieChart
            data={data?.categoryExpenses.map((item, index) => ({
              name: item.name,
              population: item.amount,
              color: item.color,
              legendFontColor: COLORS.textSecondary,
              legendFontSize: 12,
            })) || []}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        </Card>

        {/* Comparativo Mensal */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Comparativo Mensal</Text>
          <BarChart
            data={{
              labels: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
              datasets: [
                {
                  data: data?.monthlyIncome.map((income, index) => 
                    income - (data?.monthlyExpenses[index] || 0)
                  ) || [],
                },
              ],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => {
                return `rgba(16, 185, 129, ${opacity})`;
              },
            }}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix="k"
            showValuesOnTopOfBars
          />
        </Card>

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>💡 Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
              <Text style={styles.insightText}>
                Suas receitas aumentaram 15% este mês
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="warning" size={16} color={COLORS.warning} />
              <Text style={styles.insightText}>
                Gastos com alimentação estão acima da média
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.insightText}>
                Você economizou 12% comparado ao mês passado
              </Text>
            </View>
          </View>
        </Card>

        {/* Metas e Objetivos */}
        <Card style={styles.goalsCard}>
          <Text style={styles.goalsTitle}>🎯 Metas do Mês</Text>
          <View style={styles.goalsList}>
            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Economizar 100.000 AOA</Text>
                <Text style={styles.goalProgress}>75% concluído</Text>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalBarFill, { width: '75%' }]} />
              </View>
            </View>
            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Reduzir gastos em 10%</Text>
                <Text style={styles.goalProgress}>60% concluído</Text>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalBarFill, { width: '60%' }]} />
              </View>
            </View>
          </View>
        </Card>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  summaryCardSmall: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  summaryLabelSmall: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  summaryValueSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  chartCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: 16,
  },
  insightsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  insightsList: {
    gap: SPACING.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  goalsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  goalsList: {
    gap: SPACING.md,
  },
  goalItem: {
    gap: SPACING.sm,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  goalProgress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  goalBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
});