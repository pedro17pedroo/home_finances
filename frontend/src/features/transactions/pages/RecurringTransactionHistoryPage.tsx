import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { recurringTransactionsApi } from '../../../shared/api/recurring-transactions';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { showErrorToast } from '../../../shared/lib/alerts';

interface ExecutionHistoryItem {
  id: number;
  recurringTransactionId: number;
  transactionId: number | null;
  scheduledDate: string;
  executedDate: string | null;
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  accountBalanceBefore: string | null;
  accountBalanceAfter: string | null;
  errorMessage: string | null;
  transactionDescription: string | null;
  createdAt: string;
}

export function RecurringTransactionHistoryPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [params.id]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await recurringTransactionsApi.getExecutionHistory(parseInt(params.id!));
      setHistory(data);
    } catch (error) {
      showErrorToast('Erro ao carregar histórico de execuções');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Data inválida';
      
      return dateObj.toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const formatCurrency = (amount: string | number | undefined | null) => {
    if (!amount) return 'Kz 0,00';
    
    try {
      const value = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(value)) return 'Kz 0,00';
      
      return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
      }).format(value);
    } catch (error) {
      return 'Kz 0,00';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
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
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/transactions/recurring')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Histórico de Execuções</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visualize todas as execuções desta transação recorrente
          </p>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Sobre as Execuções
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Cada execução bem-sucedida gera uma transação real na sua conta, 
                  afetando o saldo disponível. Execuções falhadas não geram transações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {history.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nenhuma execução registrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Esta transação recorrente ainda não foi executada
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        item.status === 'completed' 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : item.status === 'failed'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}>
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : item.status === 'failed' ? (
                          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(item.status)}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ID: #{item.id}
                          </span>
                        </div>
                        
                        {/* Scheduled Date */}
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-medium">Agendada para:</span> {formatDate(item.scheduledDate)}
                        </div>
                        
                        {/* Executed Date */}
                        {item.executedDate && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="font-medium">Executada em:</span> {formatDate(item.executedDate)}
                          </div>
                        )}
                        
                        {/* Error Message */}
                        {item.errorMessage && (
                          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-2">
                            <span className="font-semibold">Erro:</span> {item.errorMessage}
                          </div>
                        )}
                        
                        {/* Transaction Link */}
                        {item.transactionId && (
                          <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mt-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Transação #{item.transactionId} criada com sucesso</span>
                          </div>
                        )}
                        
                        {/* Balance Info */}
                        {item.accountBalanceBefore && item.accountBalanceAfter && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                              <span className="font-medium">Saldo da Conta:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span>{formatCurrency(item.accountBalanceBefore)}</span>
                                <span>→</span>
                                <span className="font-semibold">{formatCurrency(item.accountBalanceAfter)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
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
