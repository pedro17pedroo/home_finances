import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import PlanGuard from "@/components/auth/plan-guard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/types";
import { FileText, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import type { 
  Transaction, 
  FinancialSummary, 
  MonthlyTransactionsSummary, 
  ExpensesByCategory 
} from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: summary } = useQuery<FinancialSummary>({
    queryKey: ["/api/dashboard/financial-summary"],
  });

  const { data: monthlyData } = useQuery<MonthlyTransactionsSummary[]>({
    queryKey: ["/api/dashboard/monthly-transactions"],
  });

  const { data: expenseData } = useQuery<ExpensesByCategory[]>({
    queryKey: ["/api/dashboard/expenses-by-category"],
  });

  // Calculate summary statistics
  const totalIncome = transactions?.filter(t => t.type === 'receita').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const totalExpenses = transactions?.filter(t => t.type === 'despesa').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const balance = totalIncome - totalExpenses;

  // Chart data
  const incomeExpenseData = {
    labels: monthlyData?.map(item => getMonthName(item.month)) || [],
    datasets: [
      {
        label: 'Receitas',
        data: monthlyData?.map(item => parseFloat(item.income)) || [],
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
      },
      {
        label: 'Despesas',
        data: monthlyData?.map(item => parseFloat(item.expenses)) || [],
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
      }
    ]
  };

  const expenseDistributionData = {
    labels: expenseData?.map(item => item.category) || [],
    datasets: [{
      data: expenseData?.map(item => parseFloat(item.amount)) || [],
      backgroundColor: expenseData?.map(item => CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS]) || [],
    }]
  };

  const balanceData = {
    labels: monthlyData?.map(item => getMonthName(item.month)) || [],
    datasets: [{
      label: 'Saldo',
      data: monthlyData?.map(item => parseFloat(item.income) - parseFloat(item.expenses)) || [],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      fill: true,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y || context.parsed)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${formatCurrency(context.parsed)}`;
          }
        }
      }
    }
  };

  const AdvancedReports = ({ children }: { children: React.ReactNode }) => (
    <PlanGuard requiredPlan="premium">
      {children}
    </PlanGuard>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-600">Análise completa das suas finanças</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Último mês</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Total Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {transactions?.filter(t => t.type === 'receita').length || 0} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
              Total Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {transactions?.filter(t => t.type === 'despesa').length || 0} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
              Saldo Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-600" />
              Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(
                (parseFloat(summary?.currentAccountBalance || '0') + 
                 parseFloat(summary?.totalSavings || '0') - 
                 parseFloat(summary?.totalDebts || '0'))
              )}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Contas + Poupança - Dívidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Receitas vs Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={incomeExpenseData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut data={expenseDistributionData} options={doughnutOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={balanceData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions?.filter(t => t.type === 'receita').length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Nenhuma receita registrada</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">Maior Receita</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            Math.max(...(transactions?.filter(t => t.type === 'receita').map(t => parseFloat(t.amount)) || [0]))
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">Média Mensal</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(totalIncome / 6)}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">Total de Entradas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {transactions?.filter(t => t.type === 'receita').length || 0}
                        </p>
                      </div>
                    </div>
                    <div className="h-80">
                      <Bar data={incomeExpenseData} options={chartOptions} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions?.filter(t => t.type === 'despesa').length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Nenhuma despesa registrada</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">Maior Gasto</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(
                            Math.max(...(transactions?.filter(t => t.type === 'despesa').map(t => parseFloat(t.amount)) || [0]))
                          )}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">Média Mensal</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(totalExpenses / 6)}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">Total de Saídas</p>
                        <p className="text-2xl font-bold text-red-600">
                          {transactions?.filter(t => t.type === 'despesa').length || 0}
                        </p>
                      </div>
                    </div>
                    <div className="h-80">
                      <Doughnut data={expenseDistributionData} options={doughnutOptions} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendências e Projeções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Tendência de Crescimento</h4>
                    <p className="text-sm text-slate-600">
                      Com base nos últimos 6 meses, seu saldo está 
                      {balance >= 0 ? ' crescendo' : ' diminuindo'} em média 
                      {formatCurrency(balance / 6)} por mês.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Projeção Anual</h4>
                    <p className="text-sm text-slate-600">
                      Mantendo o padrão atual, o saldo em 12 meses será de aproximadamente 
                      {formatCurrency(balance * 2)}.
                    </p>
                  </div>
                </div>
                <div className="h-80">
                  <Line data={balanceData} options={chartOptions} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
