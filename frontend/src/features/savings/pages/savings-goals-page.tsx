import React, { useState } from 'react';
import { Plus, Target, Wallet, PiggyBank, X } from 'lucide-react';
import { 
  useSavingsGoals, 
  useSavingsGoalsSummary, 
  useCreateSavingsGoal, 
  useDeleteSavingsGoal
} from '../hooks/use-savings-goals';
import { useSavingsAccounts } from '../../accounts/hooks/use-accounts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { showDeleteConfirm, showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import type { CreateSavingsGoalRequest } from '../../../shared/types';

export function SavingsGoalsPage() {
  const { data: goals, isLoading: goalsLoading } = useSavingsGoals();
  const { data: savingsAccounts, isLoading: accountsLoading } = useSavingsAccounts();
  const { isLoading: summaryLoading } = useSavingsGoalsSummary();
  const createGoalMutation = useCreateSavingsGoal();
  const deleteGoalMutation = useDeleteSavingsGoal();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateSavingsGoalRequest>({
    name: '',
    accountId: 0,
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) {
      showErrorToast('Selecione uma conta poupança');
      return;
    }
    try {
      await createGoalMutation.mutateAsync(formData);
      setShowForm(false);
      setFormData({
        name: '',
        accountId: 0,
        targetAmount: 0,
        currentAmount: 0,
        targetDate: '',
        description: '',
      });
      showSuccessToast('Meta criada com sucesso');
    } catch (error) {
      console.error('Error creating savings goal:', error);
      showErrorToast('Erro ao criar meta');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta meta de poupança');
    if (confirmed) {
      try {
        await deleteGoalMutation.mutateAsync(id);
        showSuccessToast('Meta de poupança excluída com sucesso');
      } catch (error) {
        console.error('Error deleting savings goal:', error);
        showErrorToast('Erro ao excluir meta de poupança');
      }
    }
  };

  const calculateProgress = (goal: { accountBalance?: string; currentAmount: string; targetAmount: string }) => {
    // Use account balance if available, otherwise use currentAmount
    const currentAmount = goal.accountBalance ? Number(goal.accountBalance) : Number(goal.currentAmount);
    const targetAmount = Number(goal.targetAmount);
    return targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  };

  const getCurrentAmount = (goal: { accountBalance?: string; currentAmount: string }) => {
    // Use account balance if available, otherwise use currentAmount
    return goal.accountBalance ? Number(goal.accountBalance) : Number(goal.currentAmount);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' Kz';
  };

  // Calcular totais usando saldo das contas vinculadas
  const totalSavings = goals?.reduce((sum, goal) => {
    const currentAmount = goal.accountBalance ? Number(goal.accountBalance) : Number(goal.currentAmount);
    return sum + currentAmount;
  }, 0) || 0;
  const activeGoals = goals?.length || 0;
  const totalGoalsValue = goals?.reduce((sum, goal) => sum + Number(goal.targetAmount), 0) || 0;

  if (goalsLoading || summaryLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Poupança</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas economias e metas</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            size="sm" 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total em Poupança</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalSavings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Metas Ativas</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{activeGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <PiggyBank className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valor das Metas</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalGoalsValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contas Poupança */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contas Poupança</h3>
              
              {accountsLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
                </div>
              ) : savingsAccounts && savingsAccounts.length > 0 ? (
                <div className="space-y-3">
                  {savingsAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <PiggyBank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{account.bank || 'Poupança'}</p>
                        </div>
                      </div>
                      <p className={`font-semibold ${parseFloat(account.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(parseFloat(account.balance))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PiggyBank className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma conta poupança encontrada</p>
                  <a href="/accounts" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                    Criar conta poupança
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metas de Poupança */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metas de Poupança</h3>
              
              {goals && goals.length > 0 ? (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const progress = calculateProgress(goal);
                    const currentAmount = getCurrentAmount(goal);
                    return (
                      <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{goal.name}</h4>
                            {goal.accountName && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Conta: {goal.accountName} {goal.accountBank && `(${goal.accountBank})`}
                              </p>
                            )}
                            {goal.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{goal.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(goal.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Excluir
                          </button>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>{formatCurrency(currentAmount)}</span>
                          <span>{formatCurrency(Number(goal.targetAmount))}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">{progress.toFixed(0)}%</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma meta de poupança encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Nova Meta de Poupança */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Meta de Poupança</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Vincule sua meta a uma conta poupança para acompanhar o progresso automaticamente.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Conta Poupança *
                  </label>
                  <Select
                    value={formData.accountId?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                    required
                  >
                    <option value="">Selecione uma conta</option>
                    {savingsAccounts?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bank} ({formatCurrency(parseFloat(account.balance))})
                      </option>
                    ))}
                  </Select>
                  {(!savingsAccounts || savingsAccounts.length === 0) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Você precisa criar uma conta poupança primeiro.{' '}
                      <a href="/accounts" className="underline">Criar conta</a>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Meta *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Viagem de férias"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor Meta (Kz) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.targetAmount || ''}
                    onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Meta (opcional)
                  </label>
                  <Input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva sua meta..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  O progresso da meta será calculado automaticamente com base no saldo da conta selecionada.
                </p>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGoalMutation.isPending || !savingsAccounts?.length} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {createGoalMutation.isPending ? 'Criando...' : 'Criar Meta'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
