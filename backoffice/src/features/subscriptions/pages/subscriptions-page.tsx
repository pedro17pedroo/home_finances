import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatCurrency } from '../../../shared/lib/utils';

interface Subscription {
  id: number;
  userId: number;
  planId: string;
  status: string;
  paymentType: string;
  paymentMethod: string | null;
  startDate: string;
  endDate: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  isTrialActive: boolean;
  plan?: {
    id: number;
    name: string;
    type: string;
    price: number;
  };
  user?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface Stats {
  total: number;
  active: number;
  trial: number;
  pending: number;
  expired: number;
  cancelled: number;
}

const statusLabels: Record<string, string> = {
  active: 'Activa',
  trial: 'Em Trial',
  pending: 'Pendente',
  expired: 'Expirada',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  trial: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const { data: statsData } = useQuery<{ data: Stats }>({
    queryKey: ['admin', 'subscriptions', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/subscriptions/stats');
      return response.data;
    },
  });

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const response = await apiClient.get(`/admin/subscriptions?${params}`);
      return response.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiClient.patch(`/admin/subscriptions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      setSelectedSubscription(null);
    },
  });

  const extendSubscription = useMutation({
    mutationFn: async ({ id, days }: { id: number; days: number }) => {
      await apiClient.post(`/admin/subscriptions/${id}/extend`, { days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      setSelectedSubscription(null);
    },
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await apiClient.get(`/admin/subscriptions/export?${params}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'subscriptions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const stats = statsData?.data;
  const subscriptions = subscriptionsData?.data || [];
  const pagination = subscriptionsData?.pagination;

  const filteredSubscriptions = subscriptions.filter((sub: Subscription) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const userName = `${sub.user?.firstName || ''} ${sub.user?.lastName || ''}`.toLowerCase();
    const email = (sub.user?.email || '').toLowerCase();
    const phone = (sub.user?.phone || '').toLowerCase();
    return userName.includes(search) || email.includes(search) || phone.includes(search);
  });

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-AO');
  };

  return (
    <AdminLayout title="Gestão de Assinaturas">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
                </div>
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Activas</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats?.active || 0}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Em Trial</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats?.trial || 0}</p>
                </div>
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.pending || 0}</p>
                </div>
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expiradas</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats?.expired || 0}</p>
                </div>
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Canceladas</p>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{stats?.cancelled || 0}</p>
                </div>
                <XCircle className="w-6 h-6 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos os status</option>
              <option value="active">Activas</option>
              <option value="trial">Em Trial</option>
              <option value="pending">Pendentes</option>
              <option value="expired">Expiradas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Utilizador</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plano</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Início</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fim/Trial</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dias Rest.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredSubscriptions.map((sub: Subscription) => (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {sub.user?.firstName} {sub.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{sub.user?.email || sub.user?.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{sub.plan?.name || sub.planId}</span>
                          {sub.plan?.price !== undefined && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(sub.plan.price)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[sub.status] || 'bg-gray-100 dark:bg-gray-700'}`}>
                            {statusLabels[sub.status] || sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(sub.startDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {sub.isTrialActive ? (
                            <span className="text-purple-600 dark:text-purple-400">{formatDate(sub.trialEndsAt)}</span>
                          ) : (
                            formatDate(sub.endDate)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sub.daysRemaining > 0 ? (
                            <span className={`font-medium ${sub.daysRemaining <= 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {sub.daysRemaining} dias
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedSubscription(sub)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Página {page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}

        {/* Detail Modal */}
        {selectedSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes da Assinatura</h3>
                <button onClick={() => setSelectedSubscription(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Utilizador</h4>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedSubscription.user?.firstName} {selectedSubscription.user?.lastName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSubscription.user?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSubscription.user?.phone}</p>
                </div>

                {/* Subscription Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Assinatura</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Plano:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedSubscription.plan?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${statusColors[selectedSubscription.status]}`}>
                        {statusLabels[selectedSubscription.status]}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Início:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formatDate(selectedSubscription.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Fim:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formatDate(selectedSubscription.endDate)}</span>
                    </div>
                    {selectedSubscription.trialEndsAt && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Trial termina:</span>
                        <span className="ml-2 text-purple-600 dark:text-purple-400">{formatDate(selectedSubscription.trialEndsAt)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{selectedSubscription.paymentType === 'recurring' ? 'Recorrente' : 'Único'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Método:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{selectedSubscription.paymentMethod || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Acções</h4>
                  
                  {/* Change Status */}
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      defaultValue={selectedSubscription.status}
                      onChange={(e) => {
                        if (confirm(`Alterar status para ${statusLabels[e.target.value]}?`)) {
                          updateStatus.mutate({ id: selectedSubscription.id, status: e.target.value });
                        }
                      }}
                    >
                      <option value="active">Activa</option>
                      <option value="trial">Em Trial</option>
                      <option value="pending">Pendente</option>
                      <option value="expired">Expirada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>

                  {/* Extend */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                    <Button
                      onClick={() => {
                        if (confirm(`Estender assinatura por ${extendDays} dias?`)) {
                          extendSubscription.mutate({ id: selectedSubscription.id, days: extendDays });
                        }
                      }}
                      disabled={extendSubscription.isPending}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Estender
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={() => setSelectedSubscription(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
