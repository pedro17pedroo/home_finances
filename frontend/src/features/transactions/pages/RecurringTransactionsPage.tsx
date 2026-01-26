import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { recurringTransactionsApi, RecurringTransaction } from '../../../shared/api/recurring-transactions';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { 
  Calendar, Plus, Play, Pause, Trash2, Edit, Clock, 
  TrendingUp, TrendingDown, RefreshCw, History 
} from 'lucide-react';
import { showSuccessToast, showErrorToast, showDeleteConfirm, showConfirm } from '../../../shared/lib/alerts';

export function RecurringTransactionsPage() {
  const [, setLocation] = useLocation();
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await recurringTransactionsApi.getAll();
      setTransactions(data);
    } catch (error) {
      showErrorToast('Erro ao carregar transações recorrentes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await recurringTransactionsApi.deactivate(id);
        showSuccessToast('Transação recorrente desativada');
      } else {
        await recurringTransactionsApi.activate(id);
        showSuccessToast('Transação recorrente ativada');
      }
      loadTransactions();
    } catch (error) {
      showErrorToast('Erro ao alterar status');
    }
  };

  const handleExecuteNow = async (id: number, description: string) => {
    const confirmed = await showConfirm(
      'Executar Transação Agora?',
      `A transação "${description}" será processada imediatamente e uma transação real será criada na conta.`,
      'Sim, Executar',
      'Cancelar'
    );
    
    if (!confirmed) return;

    try {
      await recurringTransactionsApi.executeNow(id);
      showSuccessToast('Transação executada com sucesso');
      loadTransactions();
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao executar transação');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta transação recorrente');
    if (!confirmed) return;

    try {
      await recurringTransactionsApi.delete(id);
      showSuccessToast('Transação recorrente excluída');
      loadTransactions();
    } catch (error) {
      showErrorToast('Erro ao excluir transação');
    }
  };

  const getFrequencyLabel = (frequency: string, interval: number) => {
    const labels: Record<string, string> = {
      daily: interval === 1 ? 'Diária' : `A cada ${interval} dias`,
      weekly: interval === 1 ? 'Semanal' : `A cada ${interval} semanas`,
      monthly: interval === 1 ? 'Mensal' : `A cada ${interval} meses`,
      yearly: interval === 1 ? 'Anual' : `A cada ${interval} anos`,
    };
    return labels[frequency] || frequency;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
            </div>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações Recorrentes</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerencie suas receitas e despesas automáticas
            </p>
          </div>
          <Button onClick={() => setLocation('/transactions/recurring/new')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação Recorrente
          </Button>
        </div>

        {transactions.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nenhuma transação recorrente
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Configure transações automáticas para receitas e despesas fixas
              </p>
              <Button onClick={() => setLocation('/transactions/recurring/new')} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Transação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className={`bg-white dark:bg-gray-800 ${!transaction.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        transaction.type === 'receita' 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {transaction.type === 'receita' ? (
                          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {transaction.description}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{transaction.categoryName}</Badge>
                          <Badge variant="secondary">
                            {getFrequencyLabel(transaction.frequency, transaction.interval)}
                          </Badge>
                          {!transaction.isActive && (
                            <Badge variant="destructive">Inativa</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.accountName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Próxima Execução</div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(transaction.nextExecutionDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Execuções</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {transaction.executionCount}
                        {transaction.maxOccurrences && ` / ${transaction.maxOccurrences}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notificar</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {transaction.notifyBeforeDays} dia(s) antes
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Canais</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {Array.isArray(transaction.notificationChannels) 
                          ? transaction.notificationChannels.join(', ')
                          : 'app'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(transaction.id, transaction.isActive)}
                    >
                      {transaction.isActive ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteNow(transaction.id, transaction.description)}
                      disabled={!transaction.isActive}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Executar Agora
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/transactions/recurring/${transaction.id}/history`)}
                    >
                      <History className="w-4 h-4 mr-1" />
                      Histórico
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/transactions/recurring/${transaction.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
