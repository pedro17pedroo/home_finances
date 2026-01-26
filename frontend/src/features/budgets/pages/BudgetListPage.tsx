import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { getBudgets, BudgetWithStatus, BudgetStatus, TimePeriodType } from '../../../shared/api/budgets';
import { useCategories } from '../../categories/hooks/use-categories';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';

/**
 * Budget List Page
 * 
 * Displays all budgets in table/card layout with:
 * - Budget details with progress indicators
 * - Visual styling for exceeded/inactive budgets
 * - Navigation to budget detail page
 * - Button to create new budget
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.2
 */
export default function BudgetListPage() {
  const [, setLocation] = useLocation();
  const [budgets, setBudgets] = useState<BudgetWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: categoriesData } = useCategories();

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await getBudgets();
      setBudgets(data);
      setError(null);
    } catch (err) {
      console.error('Error loading budgets:', err);
      setError('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };
  
  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData?.find(cat => cat.id === categoryId);
    return category?.name || `Categoria #${categoryId}`;
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

  const getStatusColor = (budget: BudgetWithStatus): string => {
    if (budget.status === BudgetStatus.INACTIVE || budget.status === BudgetStatus.ARCHIVED) {
      return 'text-gray-500';
    }
    if (budget.isExceeded) {
      return 'text-red-600';
    }
    if (budget.percentageUsed >= 90) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  const getProgressBarColor = (budget: BudgetWithStatus): string => {
    if (budget.isExceeded) {
      return 'bg-red-500';
    }
    if (budget.percentageUsed >= 90) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Orçamentos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus orçamentos e controle seus gastos
          </p>
        </div>
        <Button onClick={() => setLocation('/budgets/new')} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <TrendingUp size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nenhum orçamento criado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crie seu primeiro orçamento para controlar seus gastos
            </p>
            <Button onClick={() => setLocation('/budgets/new')} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const statusColor = getStatusColor(budget);
            const progressColor = getProgressBarColor(budget);
            const progressWidth = Math.min(budget.percentageUsed, 100);

            return (
              <Card
                key={budget.id}
                onClick={() => setLocation(`/budgets/${budget.id}`)}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  budget.status !== BudgetStatus.ACTIVE ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getCategoryName(budget.categoryId)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getTimePeriodLabel(budget.timePeriod)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(budget.amount)}
                    </p>
                    {budget.status !== BudgetStatus.ACTIVE && (
                      <span className="text-xs text-gray-500">
                        {budget.status === BudgetStatus.INACTIVE ? 'Inativo' : 'Arquivado'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Gasto:
                    </span>
                    <span className={`text-sm font-semibold ${statusColor}`}>
                      {formatCurrency(budget.currentSpending)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Percentual:
                    </span>
                    <span className={`text-sm font-bold ${statusColor}`}>
                      {budget.percentageUsed.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${progressColor} transition-all duration-300`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {budget.isExceeded ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <TrendingDown size={16} />
                      <span className="text-sm font-medium">
                        Excedido em {formatCurrency(budget.exceededAmount)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <TrendingUp size={16} />
                      <span className="text-sm">
                        Restante: {formatCurrency(budget.remainingAmount)}
                      </span>
                    </div>
                  )}
                </div>

                {budget.alerts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <AlertCircle size={14} />
                      <span>
                        {budget.alerts.length} alerta{budget.alerts.length > 1 ? 's' : ''} configurado{budget.alerts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
