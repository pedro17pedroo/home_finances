import { useState, useRef } from 'react';
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
  Upload,
  Link as LinkIcon,
  Loader2,
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
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'upload'>('url');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (bank.logoUrl?.startsWith('/uploads/')) {
      setLogoInputMode('upload');
    } else {
      setLogoInputMode('url');
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setFormData({ country: 'AO', isActive: true, displayOrder: 0 });
    setLogoInputMode('url');
  };

  const cancelEditing = () => {
    setEditingBank(null);
    setIsCreating(false);
    setFormData({});
    setLogoInputMode('url');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de ficheiro não permitido. Use: JPG, PNG, GIF, WebP ou SVG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ficheiro muito grande. Máximo: 5MB');
      return;
    }

    setUploadingLogo(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const response = await apiClient.post('/admin/upload/logo', {
          image: base64,
          originalName: file.name,
        });

        if (response.data?.data?.logoUrl) {
          updateFormField('logoUrl', response.data.data.logoUrl);
        }
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        alert('Erro ao ler ficheiro');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao carregar imagem');
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    updateFormField('logoUrl', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Bancos</p>
              <p className="text-2xl font-bold text-blue-600">{banks?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {banks?.filter(b => b.isActive).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Com Logotipo</p>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Pesquisar bancos..."
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
                {filteredBanks?.map((bank) => (
                  <div
                    key={bank.id}
                    className={`border rounded-lg p-4 transition-all ${
                      bank.isActive ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border dark:border-gray-600 flex-shrink-0">
                        {bank.logoUrl ? (
                          <img
                            src={bank.logoUrl.startsWith('/uploads') 
                              ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${bank.logoUrl}`
                              : bank.logoUrl}
                            alt={bank.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{bank.shortName || bank.name}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {bank.code}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{bank.name}</p>
                        {bank.swiftCode && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">SWIFT: {bank.swiftCode}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive.mutate({ id: bank.id, isActive: !bank.isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            bank.isActive
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
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
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredBanks?.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCreating ? 'Adicionar Banco' : 'Editar Banco'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Logo Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 relative">
                      {uploadingLogo ? (
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      ) : formData.logoUrl ? (
                        <>
                          <img
                            src={formData.logoUrl.startsWith('/uploads') 
                              ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${formData.logoUrl}`
                              : formData.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                            title="Remover logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Logotipo
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('url')}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            logoInputMode === 'url'
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <LinkIcon className="w-4 h-4" />
                          URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('upload')}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            logoInputMode === 'upload'
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                    </div>
                  </div>

                  {logoInputMode === 'url' && (
                    <div>
                      <input
                        type="url"
                        value={formData.logoUrl?.startsWith('/uploads') ? '' : (formData.logoUrl || '')}
                        onChange={(e) => updateFormField('logoUrl', e.target.value || null)}
                        placeholder="https://exemplo.com/logo.png"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {logoInputMode === 'upload' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="bank-logo-upload"
                      />
                      <label
                        htmlFor="bank-logo-upload"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingLogo
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            <span className="text-blue-600 dark:text-blue-400">A carregar...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Clique para selecionar</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código do Banco *
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => updateFormField('code', e.target.value.toUpperCase())}
                    placeholder="Ex: BAI, BFA, BIC"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Ex: Banco Angolano de Investimentos"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Short Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Abreviado
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => updateFormField('shortName', e.target.value || null)}
                    placeholder="Ex: BAI"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* SWIFT Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código SWIFT
                  </label>
                  <input
                    type="text"
                    value={formData.swiftCode || ''}
                    onChange={(e) => updateFormField('swiftCode', e.target.value.toUpperCase() || null)}
                    placeholder="Ex: BAIAAOLU"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Country & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      País
                    </label>
                    <select
                      value={formData.country || 'AO'}
                      onChange={(e) => updateFormField('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AO">Angola</option>
                      <option value="PT">Portugal</option>
                      <option value="BR">Brasil</option>
                    </select>
                  </div>
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
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
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
