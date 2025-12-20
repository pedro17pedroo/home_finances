
import { Link } from 'wouter';
import { Info, CreditCard, PiggyBank, TrendingDown, Coins, ChevronDown, Plus, Minus, Target } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { useCurrentUser } from '../../../shared/hooks/use-auth';
import { useAccountSummary } from '../../accounts/hooks/use-accounts';
import { useTransactions, useTransactionSummary } from '../../transactions/hooks/use-transactions';

export function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: accountSummary } = useAccountSummary();
  const { data: transactions } = useTransactions();
  const { data: summary } = useTransactionSummary();

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' Kz';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Test Period Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Bem-vindo ao seu período de teste!
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Você tem 14 dias para explorar todas as funcionalidades. Período de teste termina em 02/01/2026.
            </p>
          </div>
          <Link href="/plans">
            <button className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium">
              Ver Planos
            </button>
          </Link>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Conta Corrente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Conta Corrente</h3>
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {accountSummary ? formatCurrency(accountSummary.totalBalance) : '0,00 Kz'}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 dark:text-green-400">↗ +2,5% este mês</span>
            </div>
          </div>

          {/* Total Poupança */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Poupança</h3>
              <PiggyBank className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {summary ? formatCurrency(summary.totalReceitas - summary.totalDespesas > 0 ? summary.totalReceitas - summary.totalDespesas : 0) : '0,00 Kz'}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 dark:text-green-400">↗ +8,2% este mês</span>
            </div>
          </div>

          {/* Dívidas Pendentes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Dívidas Pendentes</h3>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {summary && summary.totalDespesas > summary.totalReceitas ? formatCurrency(summary.totalDespesas - summary.totalReceitas) : '0,00 Kz'}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-red-600 dark:text-red-400">↘ -15,3% este mês</span>
            </div>
          </div>

          {/* Empréstimos Dados */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Empréstimos Dados</h3>
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              0,00 Kz
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              0 empréstimos ativos
            </div>
          </div>
        </div>

        {/* Row 1: Ações Rápidas and Transações Recentes - Based on model proportions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Ações Rápidas - Smaller column (4/12 = 1/3) */}
          <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h3>
            <div className="flex flex-col gap-3">
              <Link href="/transactions?type=receita">
                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Receita
                </button>
              </Link>
              <Link href="/transactions?type=despesa">
                <button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors">
                  <Minus className="w-5 h-5 mr-2" />
                  Registrar Despesa
                </button>
              </Link>
              <Link href="/savings-goals">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors">
                  <Target className="w-5 h-5 mr-2" />
                  Criar Meta
                </button>
              </Link>
            </div>
          </div>

          {/* Transações Recentes - Larger column (8/12 = 2/3) */}
          <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transações Recentes</h3>
              <Link href="/transactions">
                <button className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-800 dark:hover:text-blue-200">
                  Ver todas
                </button>
              </Link>
            </div>
            
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        transaction.type === 'receita' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleDateString('pt-AO')}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.type === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma transação encontrada
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Receitas vs Despesas Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receitas vs Despesas</h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span>Últimos 6 meses</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </div>
            </div>
            
            {/* Simple Chart Placeholder */}
            <div className="h-64 flex items-end justify-between space-x-2">
              {[1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex space-x-1">
                    <div 
                      className="bg-green-500 rounded-t"
                      style={{ height: `${height * 200}px`, width: '50%' }}
                    />
                    <div 
                      className="bg-red-500 rounded-t"
                      style={{ height: `${(1 - height) * 200}px`, width: '50%' }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {height.toFixed(1)} Kz
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center mt-4 space-x-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Receitas</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
              </div>
            </div>
          </div>

          {/* Distribuição de Gastos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição de Gastos</h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span>Este mês</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </div>
            </div>
            
            {/* Placeholder for pie chart */}
            <div className="h-64 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl text-gray-400 dark:text-gray-500 mb-2">📊</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum dado disponível
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Metas de Poupança, Alertas e Insights, Limites de Uso (3 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Metas de Poupança */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Metas de Poupança</h3>
              <Link href="/savings-goals">
                <button className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-800 dark:hover:text-blue-200">
                  + Nova Meta
                </button>
              </Link>
            </div>
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhuma meta de poupança criada
              </div>
            </div>
          </div>

          {/* Alertas e Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alertas e Insights</h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0">✓</div>
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100 text-sm mb-1">
                    Tudo em Ordem
                  </h4>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Suas finanças estão organizadas e sem alertas no momento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Limites de Uso */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Limites de Uso</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Acompanhe o uso do seu plano atual</span>
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded">
                  Premium
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Bank Accounts Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Contas Bancárias</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {accountSummary?.totalAccounts || 0} / {user?.planType === 'basic' ? 3 : user?.planType === 'premium' ? 10 : '∞'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${user?.planType === 'enterprise' ? 0 : Math.min(100, ((accountSummary?.totalAccounts || 0) / (user?.planType === 'basic' ? 3 : 10)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.planType === 'enterprise' ? '0,0% utilizado' : `${Math.min(100, ((accountSummary?.totalAccounts || 0) / (user?.planType === 'basic' ? 3 : 10)) * 100).toFixed(1)}% utilizado`}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{accountSummary?.totalAccounts || 0}</div>
                </div>
              </div>

              {/* Transactions Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <TrendingDown className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Transações (Este Mês)</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {summary?.transactionCount || 0} / {user?.planType === 'basic' ? 100 : '∞'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${user?.planType === 'basic' ? Math.min(100, ((summary?.transactionCount || 0) / 100) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.planType === 'basic' ? `${Math.min(100, ((summary?.transactionCount || 0) / 100) * 100).toFixed(1)}% utilizado` : '0,0% utilizado'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{summary?.transactionCount || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Contas e Investimentos (Full Width) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contas e Investimentos</h3>
          
          <Link href="/accounts">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer">
              <div className="text-gray-400 dark:text-gray-500 text-2xl mb-2">+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Adicionar Conta
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}