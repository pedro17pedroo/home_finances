import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  FileText, TrendingUp, TrendingDown, DollarSign, Wallet,
  BarChart3, CreditCard, Activity, Download, FileSpreadsheet, FileDown
} from 'lucide-react';
import { useTransactionSummary, useTransactions } from '../../transactions/hooks/use-transactions';
import { useAccountSummary, useAccounts } from '../../accounts/hooks/use-accounts';
import { useSavingsGoalsSummary, useSavingsGoals } from '../../savings/hooks/use-savings-goals';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { SelectNative as Select } from '../../../shared/components/ui/select-native';
import { formatCurrency } from '../../../shared/lib/utils';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import { apiClient } from '../../../shared/api/client';

type TabType = 'visaoGeral' | 'receitas' | 'despesas' | 'tendencias';

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('visaoGeral');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: transactionSummary, isLoading: transactionsLoading } = useTransactionSummary();
  const { data: transactions } = useTransactions();
  const { data: accountSummary, isLoading: accountsLoading } = useAccountSummary();
  const { data: accounts } = useAccounts();
  const { data: savingsSummary, isLoading: savingsLoading } = useSavingsGoalsSummary();
  const { data: savingsGoals } = useSavingsGoals();

  const isLoading = transactionsLoading || accountsLoading || savingsLoading;
  const balance = transactionSummary ? transactionSummary.saldo : 0;
  const totalPatrimony = accountSummary ? accountSummary.totalBalance : 0;
  const savingsProgress = savingsSummary ? savingsSummary.totalProgress : 0;

  // Export functions
  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf' | 'txt') => {
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      if (format === 'pdf') {
        // Export PDF report
        const response = await apiClient.get('/export/pdf', {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showSuccessToast('Relatório PDF exportado com sucesso!');
      } else if (format === 'txt') {
        // Export summary report as text
        const response = await apiClient.get('/export/summary', {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resumo_financeiro_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showSuccessToast('Relatório exportado com sucesso!');
      } else {
        // Export data in Excel/CSV format
        const response = await apiClient.post('/export/data', {
          format: format === 'xlsx' ? 'xlsx' : 'csv',
          includeAccounts: true,
          includeTransactions: true,
          includeLoans: true,
          includeDebts: true,
          includeSavingsGoals: true,
          includeTransfers: true
        }, {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { 
          type: format === 'xlsx' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `financecontrol_export_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showSuccessToast(`Dados exportados em ${format.toUpperCase()} com sucesso!`);
      }
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      showErrorToast(error.response?.data?.message || 'Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare chart data
  const receitasDespesasData = [
    { name: 'Receitas', valor: transactionSummary?.totalReceitas || 0, fill: '#10B981' },
    { name: 'Despesas', valor: transactionSummary?.totalDespesas || 0, fill: '#EF4444' },
  ];

  const expensesByCategory = transactions?.filter((t) => t.type === 'despesa')
    .reduce((acc, t) => {
      const category = t.category || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>) || {};

  const incomesByCategory = transactions?.filter((t) => t.type === 'receita')
    .reduce((acc, t) => {
      const category = t.category || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>) || {};

  const pieChartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  const incomePieData = Object.entries(incomesByCategory).map(([name, value]) => ({ name, value }));

  // Monthly data for line chart (simulated based on transactions)
  const monthlyData = transactions?.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleDateString('pt-AO', { month: 'short' });
    if (!acc[month]) acc[month] = { month, receitas: 0, despesas: 0, saldo: 0 };
    if (t.type === 'receita') acc[month].receitas += Number(t.amount);
    else acc[month].despesas += Number(t.amount);
    acc[month].saldo = acc[month].receitas - acc[month].despesas;
    return acc;
  }, {} as Record<string, { month: string; receitas: number; despesas: number; saldo: number }>) || {};

  const lineChartData = Object.values(monthlyData).slice(-6);

  // KPIs
  const avgExpense = transactions?.filter(t => t.type === 'despesa').length 
    ? (transactionSummary?.totalDespesas || 0) / transactions.filter(t => t.type === 'despesa').length : 0;
  const avgIncome = transactions?.filter(t => t.type === 'receita').length
    ? (transactionSummary?.totalReceitas || 0) / transactions.filter(t => t.type === 'receita').length : 0;
  const savingsRate = (transactionSummary?.totalReceitas || 0) > 0 
    ? ((balance / (transactionSummary?.totalReceitas || 1)) * 100) : 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (<div key={i} className="h-32 bg-gray-200 rounded-lg"></div>))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Análise completa das suas finanças</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-40">
              <option value="1month">Último mês</option>
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="1year">Último ano</option>
            </Select>
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
              
              {showExportMenu && !isExporting && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                      Exportar Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileDown className="h-4 w-4 mr-2 text-blue-600" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-2 text-red-600" />
                      Relatório PDF
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-2 text-gray-600" />
                      Relatório Texto (.txt)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Receitas</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(transactionSummary?.totalReceitas || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{transactions?.filter(t => t.type === 'receita').length || 0} transações</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Despesas</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(transactionSummary?.totalDespesas || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">Gastos do período</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Líquido</span>
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
              <p className="text-xs text-gray-400 mt-1">{balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Patrimônio Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPatrimony)}</p>
              <p className="text-xs text-gray-400 mt-1">Valor total em contas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button onClick={() => setActiveTab('visaoGeral')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'visaoGeral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <BarChart3 className="w-4 h-4 mr-2" />Visão Geral
          </button>
          <button onClick={() => setActiveTab('receitas')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'receitas' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <TrendingUp className="w-4 h-4 mr-2" />Receitas
          </button>
          <button onClick={() => setActiveTab('despesas')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'despesas' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <TrendingDown className="w-4 h-4 mr-2" />Despesas
          </button>
          <button onClick={() => setActiveTab('tendencias')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tendencias' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Activity className="w-4 h-4 mr-2" />Tendências
          </button>
        </div>

        {/* Visão Geral Tab */}
        {activeTab === 'visaoGeral' && (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receitas vs Despesas Bar Chart */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg">Receitas vs Despesas</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={receitasDespesasData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="valor" name="Valor">
                        {receitasDespesasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribuição de Gastos Pie Chart */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg">Distribuição de Gastos</CardTitle></CardHeader>
                <CardContent>
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie data={pieChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieChartData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (<p className="text-center text-gray-500 py-20">Nenhuma despesa registrada</p>)}
                </CardContent>
              </Card>
            </div>

            {/* Evolução do Saldo Line Chart */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader><CardTitle className="text-lg">Evolução do Saldo</CardTitle></CardHeader>
              <CardContent>
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10B981" fill="#10B98133" />
                      <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" fill="#EF444433" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (<p className="text-center text-gray-500 py-20">Nenhuma transação registrada</p>)}
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Taxa de Poupança</p>
                  <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>{savingsRate.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Média por Despesa</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(avgExpense)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Média por Receita</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(avgIncome)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-500">Progresso Metas</p>
                  <p className="text-2xl font-bold text-purple-600">{savingsProgress.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Receitas Tab */}
        {activeTab === 'receitas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Total de Receitas</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(transactionSummary?.totalReceitas || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Quantidade</p>
                  <p className="text-3xl font-bold text-green-600">{transactions?.filter(t => t.type === 'receita').length || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Média por Receita</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(avgIncome)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg text-green-600">Receitas por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {incomePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie data={incomePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {incomePieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (<p className="text-center text-gray-500 py-20">Nenhuma receita registrada</p>)}
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg text-green-600">Detalhes por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(incomesByCategory).length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {Object.entries(incomesByCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-gray-900 dark:text-white">{category}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-center text-gray-500 py-8">Nenhuma receita registrada</p>)}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Despesas Tab */}
        {activeTab === 'despesas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Total de Despesas</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(transactionSummary?.totalDespesas || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Quantidade</p>
                  <p className="text-3xl font-bold text-red-600">{transactions?.filter(t => t.type === 'despesa').length || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-500">Média por Despesa</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(avgExpense)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg text-red-600">Despesas por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie data={pieChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieChartData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (<p className="text-center text-gray-500 py-20">Nenhuma despesa registrada</p>)}
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg text-red-600">Detalhes por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(expensesByCategory).length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-gray-900 dark:text-white">{category}</span>
                          <span className="font-semibold text-red-600">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-center text-gray-500 py-8">Nenhuma despesa registrada</p>)}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tendências Tab */}
        {activeTab === 'tendencias' && (
          <div className="space-y-6">
            {/* Evolução Mensal */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader><CardTitle className="text-lg">Evolução Mensal</CardTitle></CardHeader>
              <CardContent>
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                      <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444' }} />
                      <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (<p className="text-center text-gray-500 py-20">Nenhuma transação registrada</p>)}
              </CardContent>
            </Card>

            {/* Comparativo e Metas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg">Saúde Financeira</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400">Fluxo de Caixa</p>
                        <p className="text-xl font-bold text-green-600">{balance >= 0 ? 'Positivo' : 'Negativo'}</p>
                      </div>
                      <div className="text-3xl">{balance >= 0 ? '✓' : '⚠'}</div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-400">Diversificação</p>
                        <p className="text-xl font-bold text-blue-600">{accountSummary?.totalAccounts || 0} contas</p>
                      </div>
                      <div className="text-3xl">{(accountSummary?.totalAccounts || 0) > 1 ? '✓' : '⚠'}</div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-400">Metas de Poupança</p>
                        <p className="text-xl font-bold text-purple-600">{savingsSummary?.totalGoals || 0} metas</p>
                      </div>
                      <div className="text-3xl">{(savingsSummary?.totalGoals || 0) > 0 ? '✓' : '⚠'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardHeader><CardTitle className="text-lg">Progresso das Metas</CardTitle></CardHeader>
                <CardContent>
                  {savingsGoals && savingsGoals.length > 0 ? (
                    <div className="space-y-4">
                      {savingsGoals.slice(0, 4).map((goal) => {
                        const progress = Number(goal.targetAmount) > 0 ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100) : 0;
                        return (
                          <div key={goal.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-900 dark:text-white">{goal.name}</span>
                              <span className="text-purple-600">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (<p className="text-center text-gray-500 py-8">Nenhuma meta registrada</p>)}
                </CardContent>
              </Card>
            </div>

            {/* Contas */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader><CardTitle className="text-lg">Distribuição por Conta</CardTitle></CardHeader>
              <CardContent>
                {accounts && accounts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                      <div key={account.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3 mb-2">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                        </div>
                        <p className={`text-xl font-bold ${Number(account.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Number(account.balance))}
                        </p>
                        <p className="text-xs text-gray-500">{account.bank}</p>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-center text-gray-500 py-8">Nenhuma conta registrada</p>)}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
