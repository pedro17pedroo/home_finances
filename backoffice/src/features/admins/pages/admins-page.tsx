import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Loader2, X, Shield, ShieldOff, Eye, EyeOff } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatDate } from '../../../shared/lib/utils';

interface AdminUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isActive: boolean | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export function AdminsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'admin'
  });

  const { data: admins, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'admins'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/admins');
      return response.data.data?.admins || [];
    },
  });

  const createAdmin = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.post('/admin/admins', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const updateAdmin = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      await apiClient.put(`/admin/admins/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
      setIsEditModalOpen(false);
      setSelectedAdmin(null);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiClient.patch(`/admin/admins/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
  });

  const resetForm = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'admin' });
    setShowPassword(false);
  };

  const openEditModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setFormData({
      email: admin.email,
      password: '',
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      role: admin.role || 'admin'
    });
    setIsEditModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAdmin.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    
    const updateData: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role
    };
    
    if (formData.email !== selectedAdmin.email) {
      updateData.email = formData.email;
    }
    
    updateAdmin.mutate({ id: selectedAdmin.id, data: updateData });
  };

  const handleToggleStatus = (admin: AdminUser) => {
    const newStatus = !admin.isActive;
    if (confirm(`Tem certeza que deseja ${newStatus ? 'ativar' : 'desativar'} este administrador?`)) {
      toggleStatus.mutate({ id: admin.id, isActive: newStatus });
    }
  };

  const handleDelete = (admin: AdminUser) => {
    if (confirm(`Tem certeza que deseja eliminar o administrador "${admin.email}"? Esta ação não pode ser desfeita.`)) {
      deleteAdmin.mutate(admin.id);
    }
  };

  const getRoleBadge = (role: string | null) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
    };
    const r = role || 'admin';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[r] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
        {labels[r] || r}
      </span>
    );
  };

  const filteredAdmins = admins?.filter(admin => 
    admin.email.toLowerCase().includes(search.toLowerCase()) ||
    (admin.firstName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (admin.lastName?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Gestão de Administradores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Administrador
          </Button>
        </div>

        {/* Admins Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !filteredAdmins || filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Nenhum administrador encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Administrador</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Função</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Último Login</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-medium">
                              {(admin.firstName || admin.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {admin.firstName || admin.lastName 
                                  ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim()
                                  : 'Sem nome'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {admin.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{admin.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(admin.role)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            admin.isActive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {admin.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                          {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Nunca'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => openEditModal(admin)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" 
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(admin)}
                              className={`p-1 rounded ${admin.isActive ? 'hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-green-100 dark:hover:bg-green-900/30'}`}
                              title={admin.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {admin.isActive ? (
                                <ShieldOff className="w-4 h-4 text-red-500" />
                              ) : (
                                <Shield className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                            <button 
                              onClick={() => handleDelete(admin)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" 
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Novo Administrador</h3>
                <button onClick={() => setIsCreateModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apelido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAdmin.isPending}>
                    {createAdmin.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Administrador</h3>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apelido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateAdmin.isPending}>
                    {updateAdmin.isPending ? 'Salvando...' : 'Salvar'}
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
