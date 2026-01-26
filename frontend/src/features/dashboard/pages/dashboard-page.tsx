
import { Link } from 'wouter';
import { Info, CreditCard, PiggyBank, TrendingDown, Coins, Plus, Minus, Target, AlertTriangle, CheckCircle, Clock, XCircle, Users, Building2 } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { useCurrentUser } from '../../../shared/hooks/use-auth';
import { useAccountSummary, useAccounts, useSavingsAccounts } from '../../accounts/hooks/use-accounts';
import { useTransactions, useTransactionSummary } from '../../transactions/hooks/use-transactions';
import { useMySubscription, getSubscriptionStatusInfo } from '../../../shared/hooks/use-subscription';
import { useOrganization } from '../../../shared/contexts/organization-context';
import { useLoansSummary } from '../../loans/hooks/use-loans';
import { useDebtsSummary } from '../../debts/hooks/use-debts';
import { useFinancialOverview } from '../hooks/use-reports';
import { useSavingsGoals } from '../../savings/hooks/use-savings-goals';

export function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: accountSummary } = useAccountSummary();
  const { data: accounts } = useAccounts();
  const { data: savingsAccounts } = useSavingsAccounts();
  const { data: transactions } = useTransactions();
  const { data: summary } = useTransactionSummary();
  const { data: subscription, isLoading: subscriptionLoading } = useMySubscription();
  const { membersCount } = useOrganization();
  const { data: loansSummary } = useLoansSummary();
  const { data: debtsSummary } = useDebtsSummary();
  const { data: financialOverview } = useFinancialOverview(6);
  const { data: savingsGoals } = useSavingsGoals();
  
  const subscriptionInfo = getSubscriptionStatusInfo(subscription);

  // Get max value for chart scaling
  const maxChartValue = financialOverview?.monthlyTrend?.reduce((max, month) => {
    return Math.max(max, month.income, month.expenses);
  }, 0) || 1;
  
  // Calculate total savings from savings accounts only
  const totalSavings = savingsAccounts?.reduce((sum, account) => sum + parseFloat(account.balance), 0) || 0;

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
        {/* Subscription Status Banner */}
        {!subscriptionLoading && (
          <div className={`rounded-lg p-4 mb-6 flex items-start ${
            subscriptionInfo.statusColor === 'blue' 
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
              : subscriptionInfo.statusColor === 'green'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : subscriptionInfo.statusColor === 'red'
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : subscriptionInfo.statusColor === 'yellow'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              : 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800'
          }`}>
            {subscriptionInfo.statusColor === 'blue' && (
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            )}
            {subscriptionInfo.statusColor === 'green' && (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            )}
            {subscriptionInfo.statusColor === 'red' && (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            )}
            {subscriptionInfo.statusColor === 'yellow' && (
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
            )}
            {subscriptionInfo.statusColor === 'gray' && (
              <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-medium ${
                  subscriptionInfo.statusColor === 'blue' ? 'text-blue-900 dark:text-blue-100' :
                  subscriptionInfo.statusColor === 'green' ? 'text-green-900 dark:text-green-100' :
                  subscriptionInfo.statusColor === 'red' ? 'text-red-900 dark:text-red-100' :
                  subscriptionInfo.statusColor === 'yellow' ? 'text-yellow-900 dark:text-yellow-100' :
                  'text-gray-900 dark:text-gray-100'
                }`}>
                  {subscription?.plan?.name || 'Assinatura'} - {subscriptionInfo.statusLabel}
                </h3>
                {subscriptionInfo.isExpiring && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full">
                    Expirando em breve
                  </span>
                )}
              </div>
              <p className={`text-sm ${
                subscriptionInfo.statusColor === 'blue' ? 'text-blue-700 dark:text-blue-300' :
                subscriptionInfo.statusColor === 'green' ? 'text-green-700 dark:text-green-300' :
                subscriptionInfo.statusColor === 'red' ? 'text-red-700 dark:text-red-300' :
                subscriptionInfo.statusColor === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                'text-gray-700 dark:text-gray-300'
              }`}>
                {subscriptionInfo.message}
              </p>
              {subscription?.trialEndsAt && subscriptionInfo.status === 'trial' && (
                <p className={`text-xs mt-1 ${
                  subscriptionInfo.statusColor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Período de teste termina em {new Date(subscription.trialEndsAt).toLocaleDateString('pt-AO')}
                </p>
              )}
              {subscription?.endDate && subscriptionInfo.status === 'active' && subscriptionInfo.daysRemaining > 0 && (
                <p className={`text-xs mt-1 ${
                  subscriptionInfo.statusColor === 'green' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Próxima renovação: {new Date(subscription.endDate).toLocaleDateString('pt-AO')}
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {subscriptionInfo.showRenewButton && (
                <Link href="/subscription?tab=planos">
                  <button className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    subscriptionInfo.statusColor === 'red' 
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                    Renovar
                  </button>
                </Link>
              )}
              {subscriptionInfo.showUpgradeButton && (
                <Link href="/subscription?tab=planos">
                  <button className={`text-sm font-medium ${
                    subscriptionInfo.statusColor === 'blue' ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200' :
                    subscriptionInfo.statusColor === 'green' ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200' :
                    'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}>
                    Ver Planos
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Conta Corrente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Conta Corrente</h3>
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {accountSummary ? formatCurrency(accountSummary.currentBalance) : '0,00 Kz'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {accountSummary?.accountsByType?.corrente || 0} conta{(accountSummary?.accountsByType?.corrente || 0) !== 1 ? 's' : ''} corrente{(accountSummary?.accountsByType?.corrente || 0) !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Total Poupança */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Poupança</h3>
              <PiggyBank className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(totalSavings)}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {savingsAccounts?.length || 0} conta{(savingsAccounts?.length || 0) !== 1 ? 's' : ''} poupança
              </span>
            </div>
          </div>

          {/* Dívidas Pendentes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Dívidas Pendentes</h3>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(debtsSummary?.pendingAmount || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {debtsSummary?.pendingDebts || 0} dívida{(debtsSummary?.pendingDebts || 0) !== 1 ? 's' : ''} pendente{(debtsSummary?.pendingDebts || 0) !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Dinheiro Emprestado */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Dinheiro Emprestado</h3>
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(loansSummary?.pendingAmount || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {loansSummary?.pendingLoans || 0} empréstimo{(loansSummary?.pendingLoans || 0) !== 1 ? 's' : ''} ativo{(loansSummary?.pendingLoans || 0) !== 1 ? 's' : ''}
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
                {[...transactions]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((transaction) => {
                    const account = accounts?.find(acc => acc.id === transaction.accountId);
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            transaction.type === 'receita' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {transaction.description || transaction.category}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {transaction.category} • {account ? `${account.name} (${account.bank})` : 'Conta'} • {new Date(transaction.date).toLocaleDateString('pt-AO')}
                            </div>
                            {transaction.balanceAfter && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                Saldo: {transaction.balanceBefore ? formatCurrency(Number(transaction.balanceBefore)) : '—'} → {formatCurrency(Number(transaction.balanceAfter))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className={`text-sm font-semibold ${
                            transaction.type === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                          </div>
                          {transaction.balanceAfter && (
                            <div className="text-xs text-gray-500">
                              Saldo: {formatCurrency(Number(transaction.balanceAfter))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              </div>
            </div>
            
            {financialOverview?.monthlyTrend && financialOverview.monthlyTrend.length > 0 ? (
              <>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {financialOverview.monthlyTrend.map((month, index) => {
                    const incomeHeight = maxChartValue > 0 ? (month.income / maxChartValue) * 200 : 0;
                    const expenseHeight = maxChartValue > 0 ? (month.expenses / maxChartValue) * 200 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex space-x-1 items-end" style={{ height: '200px' }}>
                          <div 
                            className="bg-green-500 rounded-t flex-1"
                            style={{ height: `${Math.max(incomeHeight, 2)}px` }}
                            title={`Receitas: ${formatCurrency(month.income)}`}
                          />
                          <div 
                            className="bg-red-500 rounded-t flex-1"
                            style={{ height: `${Math.max(expenseHeight, 2)}px` }}
                            title={`Despesas: ${formatCurrency(month.expenses)}`}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center">
                          {month.month}
                        </div>
                      </div>
                    );
                  })}
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
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl text-gray-400 dark:text-gray-500 mb-2">📊</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum dado disponível
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Distribuição de Gastos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição de Gastos</h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span>Últimos 6 meses</span>
              </div>
            </div>
            
            {financialOverview?.categoryBreakdown && financialOverview.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {financialOverview.categoryBreakdown.slice(0, 6).map((category, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
                  return (
                    <div key={index} className="flex items-center">
                      <div className={`w-3 h-3 ${colors[index % colors.length]} rounded mr-3`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {category.category}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`${colors[index % colors.length]} h-2 rounded-full`}
                            style={{ width: `${Math.min(category.percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {category.percentage.toFixed(1)}% • {category.transactionCount} transações
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl text-gray-400 dark:text-gray-500 mb-2">📊</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum dado disponível
                  </div>
                </div>
              </div>
            )}
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
            {savingsGoals && savingsGoals.length > 0 ? (
              <div className="space-y-3">
                {savingsGoals.slice(0, 3).map((goal) => {
                  const currentAmount = goal.accountBalance ? parseFloat(goal.accountBalance) : parseFloat(goal.currentAmount);
                  const targetAmount = parseFloat(goal.targetAmount);
                  const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
                  const isCompleted = progress >= 100;
                  
                  return (
                    <div key={goal.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {goal.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          isCompleted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(currentAmount)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(targetAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {savingsGoals.length > 3 && (
                  <Link href="/savings-goals">
                    <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 py-2">
                      Ver todas ({savingsGoals.length})
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma meta de poupança criada
                </div>
                <Link href="/savings-goals">
                  <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                    Criar primeira meta
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Alertas e Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alertas e Insights</h3>
            <div className="space-y-3">
              {/* Alerta de despesas maiores que receitas */}
              {financialOverview && financialOverview.totalExpenses > financialOverview.totalIncome && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-900 dark:text-red-100 text-sm">
                        Despesas Elevadas
                      </h4>
                      <p className="text-red-700 dark:text-red-300 text-xs mt-0.5">
                        Suas despesas ({formatCurrency(financialOverview.totalExpenses)}) excedem suas receitas ({formatCurrency(financialOverview.totalIncome)}).
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Alerta de dívidas pendentes */}
              {debtsSummary && debtsSummary.pendingDebts > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">
                        Dívidas Pendentes
                      </h4>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">
                        Você tem {debtsSummary.pendingDebts} dívida{debtsSummary.pendingDebts > 1 ? 's' : ''} pendente{debtsSummary.pendingDebts > 1 ? 's' : ''} totalizando {formatCurrency(debtsSummary.pendingAmount)}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Alerta de empréstimos a receber */}
              {loansSummary && loansSummary.pendingLoans > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                        Empréstimos a Receber
                      </h4>
                      <p className="text-blue-700 dark:text-blue-300 text-xs mt-0.5">
                        Você tem {formatCurrency(loansSummary.pendingAmount)} em empréstimos a receber.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Insight de taxa de poupança */}
              {financialOverview && financialOverview.savingsRate > 20 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">
                        Boa Taxa de Poupança
                      </h4>
                      <p className="text-green-700 dark:text-green-300 text-xs mt-0.5">
                        Você está poupando {financialOverview.savingsRate.toFixed(1)}% da sua renda. Continue assim!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mensagem padrão se não houver alertas */}
              {(!financialOverview || financialOverview.totalExpenses <= financialOverview.totalIncome) &&
               (!debtsSummary || debtsSummary.pendingDebts === 0) &&
               (!loansSummary || loansSummary.pendingLoans === 0) &&
               (!financialOverview || financialOverview.savingsRate <= 20) && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
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
              )}
            </div>
          </div>

          {/* Limites de Uso */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Limites de Uso</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Acompanhe o uso do seu plano atual</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  subscription?.plan?.type === 'premium' 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    : subscription?.plan?.type === 'enterprise'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                }`}>
                  {subscription?.plan?.name || user?.planType || 'Basic'}
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
                    {accountSummary?.totalAccounts || 0} / {subscription?.plan?.maxAccounts === -1 ? '∞' : (subscription?.plan?.maxAccounts || 1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: subscription?.plan?.maxAccounts === -1 ? '5%' : `${Math.min(100, ((accountSummary?.totalAccounts || 0) / (subscription?.plan?.maxAccounts || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {subscription?.plan?.maxAccounts === -1 ? 'Ilimitado' : `${Math.min(100, ((accountSummary?.totalAccounts || 0) / (subscription?.plan?.maxAccounts || 1)) * 100).toFixed(1)}% utilizado`}
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
                    {summary?.transactionCount || 0} / {subscription?.plan?.maxTransactions === -1 ? '∞' : (subscription?.plan?.maxTransactions || 50)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: subscription?.plan?.maxTransactions === -1 ? '5%' : `${Math.min(100, ((summary?.transactionCount || 0) / (subscription?.plan?.maxTransactions || 50)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {subscription?.plan?.maxTransactions === -1 ? 'Ilimitado' : `${Math.min(100, ((summary?.transactionCount || 0) / (subscription?.plan?.maxTransactions || 50)) * 100).toFixed(1)}% utilizado`}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{summary?.transactionCount || 0}</div>
                </div>
              </div>

              {/* Users Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Utilizadores</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {membersCount} / {subscription?.plan?.maxUsers || 1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(100, (membersCount / (subscription?.plan?.maxUsers || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.min(100, (membersCount / (subscription?.plan?.maxUsers || 1)) * 100).toFixed(1)}% utilizado
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{membersCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Contas e Investimentos (Full Width) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contas e Investimentos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add account card - always first */}
            <Link href="/accounts">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex items-center justify-center hover:border-green-500 dark:hover:border-green-500 transition-colors cursor-pointer min-h-[120px]">
                <div className="text-center">
                  <div className="text-gray-400 dark:text-gray-500 text-2xl mb-1">+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Adicionar Conta
                  </div>
                </div>
              </div>
            </Link>
            
            {/* Existing accounts */}
            {accounts && accounts.map((account) => (
              <Link key={account.id} href="/accounts">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-500 dark:hover:border-green-500 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {account.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {account.bank || (account.type === 'poupanca' ? 'Poupança' : 'Corrente')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      parseFloat(account.balance) >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(parseFloat(account.balance))}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}