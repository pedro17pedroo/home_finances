import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, MoreVertical, Eye, Edit, Ban, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatDate } from '../../../shared/lib/utils';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  planType: string;
  subscriptionStatus: string;
  createdAt: string;
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users', search, statusFilter, planFilter],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/users', {
          params: { search, status: statusFilter, plan: planFilter },
        });
        return response.data.users;
      } catch {
        return [
          { id: 1, firstName: 'João', lastName: 'Silva', email: 'joao@email.com', phone: '923456789', planType: 'premium', subscriptionStatus: 'active', createdAt: '2025-01-15' },
          { id: 2, firstName: 'Maria', lastName: 'Santos', email: 'maria@email.com', phone: '912345678', planType: 'basic', subscriptionStatus: 'trialing', createdAt: '2025-02-10' },
          { id: 3, firstName: 'Pedro', lastName: 'Costa', email: 'pedro@email.com', phone: '934567890', planType: 'enterprise', subscriptionStatus: 'active', createdAt: '2025-03-05' },
        ];
      }
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      trialing: 'bg-blue-100 text-blue-700',
      canceled: 'bg-red-100 text-red-700',
      past_due: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      active: 'Ativo',
      trialing: 'Teste',
      canceled: 'Cancelado',
      past_due: 'Atrasado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      basic: 'bg-gray-100 text-gray-700',
      premium: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[plan] || 'bg-gray-100 text-gray-700'}`}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout title="Gestão de Usuários">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, email ou telefone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="trialing">Em Teste</option>
                <option value="canceled">Cancelado</option>
              </select>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Planos</option>
                <option value="basic">Básico</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Usuário</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Contato</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Plano</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Criado em</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users?.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-500">ID: {user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.phone}</p>
                        </td>
                        <td className="py-3 px-4">{getPlanBadge(user.planType)}</td>
                        <td className="py-3 px-4">{getStatusBadge(user.subscriptionStatus)}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(user.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button className="p-1 hover:bg-gray-100 rounded" title="Ver detalhes">
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded" title="Editar">
                              <Edit className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded" title="Bloquear">
                              <Ban className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
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
      </div>
    </AdminLayout>
  );
}
