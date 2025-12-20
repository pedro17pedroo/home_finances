import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Edit, Ban, Loader2, X, CheckCircle } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatDate } from '../../../shared/lib/utils';

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  planType: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', planType: 'basic' });

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['admin', 'users', search, statusFilter, planFilter],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users', {
        params: { search, status: statusFilter, plan: planFilter },
      });
      return response.data.users || [];
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      await apiClient.patch(`/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedUser(null);
      setIsDetailModalOpen(false);
    },
  });

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      planType: user.planType || 'basic',
    });
    setIsEditModalOpen(true);
  };

  const toggleUserStatus = (user: User) => {
    const isCurrentlyActive = user.subscriptionStatus === 'active';
    if (confirm(`Tem certeza que deseja ${isCurrentlyActive ? 'desativar' : 'ativar'} este usuário?`)) {
      updateUserStatus.mutate({ userId: user.id, isActive: !isCurrentlyActive });
    }
  };

  const getStatusBadge = (status: string | null) => {
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
    const s = status || 'trialing';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
        {labels[s] || s}
      </span>
    );
  };

  const getPlanBadge = (plan: string | null) => {
    const styles: Record<string, string> = {
      basic: 'bg-gray-100 text-gray-700',
      premium: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-orange-100 text-orange-700',
    };
    const p = plan || 'basic';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[p] || 'bg-gray-100 text-gray-700'}`}>
        {p.charAt(0).toUpperCase() + p.slice(1)}
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
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Erro ao carregar usuários. Tente novamente.
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhum usuário encontrado.
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
                              {(user.firstName || 'U').charAt(0)}{(user.lastName || '').charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">{user.firstName || ''} {user.lastName || ''}</p>
                              <p className="text-sm text-gray-500">ID: {user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{user.email || '-'}</p>
                          <p className="text-sm text-gray-500">{user.phone || '-'}</p>
                        </td>
                        <td className="py-3 px-4">{getPlanBadge(user.planType)}</td>
                        <td className="py-3 px-4">{getStatusBadge(user.subscriptionStatus)}</td>
                        <td className="py-3 px-4 text-gray-600">{user.createdAt ? formatDate(user.createdAt) : '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => viewUserDetails(user)}
                              className="p-1 hover:bg-blue-100 rounded" 
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                            </button>
                            <button 
                              onClick={() => openEditModal(user)}
                              className="p-1 hover:bg-gray-100 rounded" 
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </button>
                            <button 
                              onClick={() => toggleUserStatus(user)}
                              className={`p-1 rounded ${user.subscriptionStatus === 'active' ? 'hover:bg-red-100' : 'hover:bg-green-100'}`}
                              title={user.subscriptionStatus === 'active' ? 'Desativar' : 'Ativar'}
                            >
                              {user.subscriptionStatus === 'active' ? (
                                <Ban className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
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

        {/* User Detail Modal */}
        {isDetailModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Detalhes do Usuário</h3>
                <button onClick={() => setIsDetailModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {(selectedUser.firstName || 'U').charAt(0)}{(selectedUser.lastName || '').charAt(0)}
                  </div>
                  <div className="ml-4">
                    <p className="text-xl font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-gray-500">ID: {selectedUser.id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedUser.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{selectedUser.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Plano</p>
                    {getPlanBadge(selectedUser.planType)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(selectedUser.subscriptionStatus)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Criado em</p>
                    <p className="font-medium">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : '-'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openEditModal(selectedUser);
                    }}
                    variant="outline" 
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    onClick={() => toggleUserStatus(selectedUser)}
                    variant={selectedUser.subscriptionStatus === 'active' ? 'outline' : 'default'}
                    className={`flex-1 ${selectedUser.subscriptionStatus === 'active' ? 'text-red-600 border-red-600' : ''}`}
                  >
                    {selectedUser.subscriptionStatus === 'active' ? (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ativar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Editar Usuário</h3>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                  <select
                    value={editForm.planType}
                    onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => {
                    alert('Funcionalidade de edição será implementada em breve');
                    setIsEditModalOpen(false);
                  }}>
                    Salvar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
