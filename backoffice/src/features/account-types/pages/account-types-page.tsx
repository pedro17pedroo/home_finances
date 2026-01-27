import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Banknote,
  Building2,
  DollarSign,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import Swal from 'sweetalert2';

interface AccountType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  displayOrder: number;
}

export function AccountTypesPage() {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<AccountType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<AccountType>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: accountTypes, isLoading } = useQuery<AccountType[]>({
    queryKey: ['admin', 'account-types'],
    queryFn: async () => {
      const response = await apiClient.get('/account-types/admin/all');
      return response.data?.data || [];
    },
  });

  const createType = useMutation({
    mutationFn: async (data: Partial<AccountType>) => {
      await apiClient.post('/account-types/admin/create', data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'account-types'] });
      setIsCreating(false);
      setFormData({});
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Tipo de conta criado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: async (error: any) => {
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao criar tipo de conta',
        confirmButtonColor: '#3b82f6',
      });
    },
  });

  const updateType = useMutation({
    mutationFn: async (data: Partial<AccountType> & { id: number }) => {
      await apiClient.put(`/account-types/admin/${data.id}`, data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'account-types'] });
      setEditingType(null);
      setFormData({});
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Tipo de conta atualizado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: async (error: any) => {
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao atualizar tipo de conta',
        confirmButtonColor: '#3b82f6',
      });
    },
  });

  const deleteType = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/account-types/admin/${id}`);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'account-types'] });
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Tipo de conta eliminado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: async (error: any) => {
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao eliminar tipo de conta',
        confirmButtonColor: '#3b82f6',
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiClient.patch(`/account-types/admin/${id}/toggle`, { isActive });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'account-types'] });
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Status atualizado com sucesso!',
        timer: 2000,
        showConfirmButton: false,
      });
    },
    onError: async (error: any) => {
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao atualizar status',
        confirmButtonColor: '#3b82f6',
      });
    },
  });

  const startEditing = (type: AccountType) => {
    setEditingType(type);
    setFormData({ ...type });
  };

  const startCreating = () => {
    setIsCreating(true);
    setFormData({ isActive: true, displayOrder: 0, color: '#3b82f6' });
  };

  const cancelEditing = () => {
    setEditingType(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = () => {
    if (isCreating) {
      createType.mutate(formData);
    } else if (editingType) {
      updateType.mutate({ id: editingType.id, ...formData });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirmar exclusão',
      text: 'Tem certeza que deseja eliminar este tipo de conta?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      deleteType.mutate(id);
    }
  };

  const updateFormField = (field: keyof AccountType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredTypes = accountTypes?.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Common icons for account types
  const iconOptions = [
    { value: 'wallet', label: 'Carteira', component: Wallet },
    { value: 'credit-card', label: 'Cartão', component: CreditCard },
    { value: 'piggy-bank', label: 'Poupança', component: PiggyBank },
    { value: 'trending-up', label: 'Investimento', component: TrendingUp },
    { value: 'banknote', label: 'Dinheiro', component: Banknote },
    { value: 'building', label: 'Banco', component: Building2 },
  ];

  const getIconComponent = (iconValue: string | null) => {
    const option = iconOptions.find(opt => opt.value === iconValue);
    if (option) {
      const IconComponent = option.component;
      return <IconComponent className="w-6 h-6" />;
    }
    return <Wallet className="w-6 h-6" />;
  };

  return (
    <AdminLayout title="Tipos de Conta">
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie os tipos de conta disponíveis no sistema
        </p>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Tipos</p>
              <p className="text-2xl font-bold text-blue-600">{accountTypes?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {accountTypes?.filter(t => t.isActive).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Inativos</p>
              <p className="text-2xl font-bold text-gray-600">
                {accountTypes?.filter(t => !t.isActive).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Types List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Lista de Tipos de Conta
              </CardTitle>
              <Button onClick={startCreating} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Tipo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Pesquisar tipos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTypes?.map((type) => (
                  <div
                    key={type.id}
                    className={`border rounded-lg p-4 transition-all ${
                      type.isActive ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${type.color}20`, color: type.color || '#3b82f6' }}
                      >
                        {getIconComponent(type.icon)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{type.name}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {type.code}
                          </span>
                        </div>
                        {type.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive.mutate({ id: type.id, isActive: !type.isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            type.isActive
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={type.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {type.isActive ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(type)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTypes?.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nenhum tipo de conta encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Modal */}
        {(editingType || isCreating) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCreating ? 'Adicionar Tipo de Conta' : 'Editar Tipo de Conta'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => updateFormField('code', e.target.value.toUpperCase())}
                    placeholder="Ex: CHECKING, SAVINGS"
                    maxLength={50}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Ex: Conta Corrente"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormField('description', e.target.value || null)}
                    placeholder="Descrição do tipo de conta..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ícone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {iconOptions.map((option) => {
                      const IconComponent = option.component;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateFormField('icon', option.value)}
                          className={`p-3 border rounded-lg text-center transition-all ${
                            formData.icon === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          <div className="flex justify-center mb-1">
                            <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cor
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color || '#3b82f6'}
                      onChange={(e) => updateFormField('color', e.target.value)}
                      className="w-16 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color || '#3b82f6'}
                      onChange={(e) => updateFormField('color', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder || 0}
                    onChange={(e) => updateFormField('displayOrder', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createType.isPending || updateType.isPending || !formData.code || !formData.name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createType.isPending || updateType.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
