import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell,
  Calendar,
} from 'lucide-react';
import {
  getBudget,
  deleteBudget,
  getBudgetHistory,
  BudgetWithStatus,
  BudgetHistory,
  BudgetStatus,
  TimePeriodType,
  AlertPosition,
  ThresholdType,
} from '../../../shared/api/budgets';
import { useCategories } from '../../categories/hooks/use-categories';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';

/**
 * Budget Detail Page
 * 
 * Displays detailed budget information with:
 * - Budget information with current spending
 * - Spending visualization (progress bar/chart)
 * - Configured alerts
 * - Edit and delete buttons
 * - Alert history from archived periods
 * 
 * Requirements: 5.2, 5.3, 7.2
 */
export default function BudgetDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [budget, setBudget] = useState<BudgetWithStatus | null>(null);
  const [history, setHistory] = useState<BudgetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: categoriesData } = useCategories();

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (budgetId: number) => {
    try {
      const [budgetData, historyData] = await Promise.all([
        getBudget(budgetId),
        getBudgetHistory(budgetId),
      ]);
      setBudget(budgetData);
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading budget:', err);
      setError('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      return;
    }

    try {
      await deleteBudget(parseInt(id));
      setLocation('/budgets');
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Erro ao excluir orçamento');
    }
  };

  const getTimePeriodLabel = (period: TimePeriodType): string => {
    const labels = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
      annual: 'Anual',
      custom: 'Personalizado',
    };
    return labels[period] || period;
  };

  const getAlertLabel = (alert: any): string => {
    const position = alert.position === AlertPosition.BEFORE_LIMIT ? 'antes' : 'depois';
    const threshold =
      alert.thresholdType === ThresholdType.PERCENTAGE
        ? `${alert.thresholdValue}%`
        : formatCurrency(alert.thresholdValue);
    return `${threshold} ${position} do limite`;
  };

  const getProgressColor = (): string => {
    if (!budget) return 'bg-green-500';
    if (budget.isExceeded) return 'bg-red-500';
    if (budget.percentageUsed >= 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (): string => {
    if (!budget) return 'text-green-600';
    if (budget.isExceeded) return 'text-red-600';
    if (budget.percentageUsed >= 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
  };
  
  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData?.find(cat => cat.id === categoryId);
    return category?.name || `Categoria #${categoryId}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (error || !budget) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Orçamento não encontrado'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const progressWidth = Math.min(budget.percentageUsed, 100);
  const progressColor = getProgressColor();
  const statusColor = getStatusColor();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <button
          onClick={() => setLocation('/budgets')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Detalhes do Orçamento
            </h1>
            {budget.status !== BudgetStatus.ACTIVE && (
              <span className="inline-block mt-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation(`/budgets/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={18} />
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} />
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Budget Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Informações do Orçamento
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categoria</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getCategoryName(budget.categoryId)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Período</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getTimePeriodLabel(budget.timePeriod)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor do Orçamento</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(budget.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Moeda</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {budget.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Spending Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Gastos Atuais
          </h2>

          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gasto Total</p>
              <p className={`text-3xl font-bold ${statusColor}`}>
                {formatCurrency(budget.currentSpending)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Percentual</p>
              <p className={`text-3xl font-bold ${statusColor}`}>
                {budget.percentageUsed.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {budget.isExceeded ? (
              <>
                <TrendingDown className="text-red-600" size={20} />
                <span className="text-lg font-semibold text-red-600">
                  Excedido em {formatCurrency(budget.exceededAmount)}
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="text-green-600" size={20} />
                <span className="text-lg font-semibold text-green-600">
                  Restante: {formatCurrency(budget.remainingAmount)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Alerts Card */}
        {budget.alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Alertas Configurados
            </h2>
            <div className="space-y-4">
              {budget.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <Bell className="text-blue-600 mt-1" size={20} />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {getAlertLabel(alert)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {alert.channels.map((channel: any) =>
                        channel.enabled ? (
                          <span
                            key={channel.type}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                          >
                            {channel.type === 'in_app'
                              ? 'App'
                              : channel.type === 'email'
                              ? 'Email'
                              : 'SMS'}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Card */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Histórico de Períodos
            </h2>
            <div className="space-y-4">
              {history.map((period) => (
                <div
                  key={period.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                    <Calendar size={16} />
                    <span className="text-sm">
                      {new Date(period.periodStartDate).toLocaleDateString('pt-BR')} -{' '}
                      {new Date(period.periodEndDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gasto</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(period.finalSpendingAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Percentual</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {period.percentageUsed.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
}
