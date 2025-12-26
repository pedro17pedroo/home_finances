import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Search,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';

interface Bank {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  swiftCode: string | null;
  country: string;
  isActive: boolean;
  displayOrder: number;
}

export function BanksPage() {
  const queryClient = useQueryClient();
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Bank>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: banks, isLoading } = useQuery<Bank[]>({
    queryKey: ['admin', 'banks'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/banks');
      return response.data?.banks || [];
    },
  });

  const createBank = useMutation({
    mutationFn: async (data: Partial<Bank>) => {
      await apiClient.post('/admin/banks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banks'] });
      setIsCreating(false);
      setFormData({});
    },
  });

  const updateBank = useMutation({
    mutationFn: async (data: Partial<Bank> & { id: number }) => {
      await apiClient.put(`/admin/banks/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banks'] });
      setEditingBank(null);
      setFormData({});
    },
  });

  const deleteBank = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/banks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banks'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiClient.patch(`/admin/banks/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banks'] });
    },
  });

  const startEditing = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({ ...bank });
  };

  const startCreating = () => {
    setIsCreating(true);
    setFormData({ country: 'AO', isActive: true, displayOrder: 0 });
  };

  const cancelEditing = () => {
    setEditingBank(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = () => {
    if (isCreating) {
      createBank.mutate(formData);
    } else if (editingBank) {
      updateBank.mutate({ id: editingBank.id, ...formData });
    }
  };

  const updateFormField = (field: keyof Bank, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredBanks = banks?.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bank.shortName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout title="Gestão de Bancos">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Total de Bancos</p>
              <p className="text-2xl font-bold text-blue-600">{banks?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {banks?.filter(b => b.isActive).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500">Com Logotipo</p>
              <p className="text-2xl font-bold text-purple-600">
                {banks?.filter(b => b.logoUrl).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Banks List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Lista de Bancos
              </CardTitle>
              <Button onClick={startCreating} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Banco
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar bancos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBanks?.map((bank) => (
                  <div
                    key={bank.id}
                    className={`border rounded-lg p-4 transition-all ${
                      bank.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border flex-shrink-0">
                        {bank.logoUrl ? (
                          <img
                            src={bank.logoUrl}
                            alt={bank.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{bank.shortName || bank.name}</h3>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {bank.code}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{bank.name}</p>
                        {bank.swiftCode && (
                          <p className="text-xs text-gray-500">SWIFT: {bank.swiftCode}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive.mutate({ id: bank.id, isActive: !bank.isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            bank.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={bank.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {bank.isActive ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(bank)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja eliminar este banco?')) {
                              deleteBank.mutate(bank.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredBanks?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum banco encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Modal */}
        {(editingBank || isCreating) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {isCreating ? 'Adicionar Banco' : 'Editar Banco'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Logo Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL do Logotipo
                    </label>
                    <input
                      type="url"
                      value={formData.logoUrl || ''}
                      onChange={(e) => updateFormField('logoUrl', e.target.value || null)}
                      placeholder="https://exemplo.com/logo.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código do Banco *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => updateFormField('code', e.target.value.toUpperCase())}
                    placeholder="Ex: BAI, BFA, BIC"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Ex: Banco Angolano de Investimentos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Short Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Abreviado
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => updateFormField('shortName', e.target.value || null)}
                    placeholder="Ex: BAI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* SWIFT Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código SWIFT
                  </label>
                  <input
                    type="text"
                    value={formData.swiftCode || ''}
                    onChange={(e) => updateFormField('swiftCode', e.target.value.toUpperCase() || null)}
                    placeholder="Ex: BAIAAOLU"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Country & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      País
                    </label>
                    <select
                      value={formData.country || 'AO'}
                      onChange={(e) => updateFormField('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="AO">Angola</option>
                      <option value="PT">Portugal</option>
                      <option value="BR">Brasil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder || 0}
                      onChange={(e) => updateFormField('displayOrder', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createBank.isPending || updateBank.isPending || !formData.code || !formData.name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createBank.isPending || updateBank.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
