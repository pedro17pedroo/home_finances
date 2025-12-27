import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CreditCard,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';

interface Payment {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  referenceCode: string;
  createdAt: string;
  paidAt: string | null;
}

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ['admin', 'payments', statusFilter],
    queryFn: async () => {
      const response = await apiClient.get('/admin/payments', { params: { status: statusFilter } });
      return response.data || [];
    },
  });

  const approvePayment = useMutation({
    mutationFn: async (paymentId: number) => {
      await apiClient.post(`/admin/payments/${paymentId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      setSelectedPayment(null);
    },
  });

  const rejectPayment = useMutation({
    mutationFn: async (paymentId: number) => {
      await apiClient.post(`/admin/payments/${paymentId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      setSelectedPayment(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: Clock, label: 'Pendente' },
      paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: CheckCircle, label: 'Pago' },
      failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: XCircle, label: 'Falhado' },
      expired: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-400', icon: Clock, label: 'Expirado' },
    };
    const { bg, text, icon: Icon, label } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </span>
    );
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      ekwanza: 'E-Kwanza',
      gpo: 'Multicaixa Express',
      ref: 'Referência Multicaixa',
    };
    return labels[method] || method;
  };

  return (
    <AdminLayout title="Gestão de Pagamentos">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Pendentes', value: payments?.filter(p => p.status === 'pending').length || 0, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Pagos', value: payments?.filter(p => p.status === 'paid').length || 0, color: 'text-green-600 dark:text-green-400' },
            { label: 'Falhados', value: payments?.filter(p => p.status === 'failed').length || 0, color: 'text-red-600 dark:text-red-400' },
            { label: 'Total', value: formatCurrency(payments?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0) || 0), color: 'text-blue-600 dark:text-blue-400' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              {['all', 'pending', 'paid', 'failed'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                  size="sm"
                >
                  {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'paid' ? 'Pagos' : 'Falhados'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Usuário</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Valor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Método</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Referência</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments?.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 font-mono text-sm text-gray-900 dark:text-white">#{payment.id}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{payment.userName}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{getMethodLabel(payment.paymentMethod)}</td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-600 dark:text-gray-300">{payment.referenceCode}</td>
                        <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedPayment(payment)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            {payment.status === 'pending' && (
                              <>
                                <button onClick={() => approvePayment.mutate(payment.id)} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg">
                                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </button>
                                <button onClick={() => rejectPayment.mutate(payment.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Detail Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes do Pagamento</h3>
                <button onClick={() => setSelectedPayment(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">ID:</span><span className="font-mono text-gray-900 dark:text-white">#{selectedPayment.id}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Usuário:</span><span className="text-gray-900 dark:text-white">{selectedPayment.userName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Valor:</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Método:</span><span className="text-gray-900 dark:text-white">{getMethodLabel(selectedPayment.paymentMethod)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Referência:</span><span className="font-mono text-gray-900 dark:text-white">{selectedPayment.referenceCode}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Status:</span>{getStatusBadge(selectedPayment.status)}</div>
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Criado em:</span><span className="text-gray-900 dark:text-white">{formatDate(selectedPayment.createdAt)}</span></div>
                {selectedPayment.paidAt && <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Pago em:</span><span className="text-gray-900 dark:text-white">{formatDate(selectedPayment.paidAt)}</span></div>}
              </div>
              {selectedPayment.status === 'pending' && (
                <div className="mt-6 flex gap-2">
                  <Button onClick={() => approvePayment.mutate(selectedPayment.id)} className="flex-1 bg-green-600 hover:bg-green-700">Aprovar</Button>
                  <Button onClick={() => rejectPayment.mutate(selectedPayment.id)} variant="outline" className="flex-1 text-red-600 dark:text-red-400 border-red-600 dark:border-red-400">Rejeitar</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
