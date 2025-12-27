import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Edit,
  Save,
  X,
  GripVertical,
  Image as ImageIcon,
  Zap,
  Clock,
  Phone,
  Mail,
  FileText,
  ToggleLeft,
  ToggleRight,
  Upload,
  Link as LinkIcon,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isInstant: boolean;
  waitTimeSeconds: number;
  maxWaitTimeSeconds: number;
  requiresPhone: boolean;
  requiresEmail: boolean;
  requiresReference: boolean;
  processingTime: string | null;
  icon: string | null;
  logoUrl: string | null;
  displayOrder: number;
}

export function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({});
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'upload'>('url');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['admin', 'payment-methods'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/payment-methods');
      return response.data?.paymentMethods || [];
    },
  });

  const updateMethod = useMutation({
    mutationFn: async (data: Partial<PaymentMethod> & { id: number }) => {
      await apiClient.put(`/admin/payment-methods/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
      setEditingMethod(null);
      setFormData({});
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiClient.patch(`/admin/payment-methods/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] });
    },
  });

  const startEditing = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({ ...method });
    // Detect if current logo is uploaded or URL
    if (method.logoUrl?.startsWith('/uploads/')) {
      setLogoInputMode('upload');
    } else {
      setLogoInputMode('url');
    }
  };

  const cancelEditing = () => {
    setEditingMethod(null);
    setFormData({});
    setLogoInputMode('url');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de ficheiro não permitido. Use: JPG, PNG, GIF, WebP ou SVG');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ficheiro muito grande. Máximo: 5MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Upload to server
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
    if (editingMethod && formData) {
      updateMethod.mutate({ id: editingMethod.id, ...formData });
    }
  };

  const updateFormField = (field: keyof PaymentMethod, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout title="Métodos de Pagamento">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Métodos</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{methods?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ativos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {methods?.filter(m => m.isActive).length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Instantâneos</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {methods?.filter(m => m.isInstant).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Methods List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Configurar Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {methods?.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 transition-all ${
                      method.isActive ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag Handle & Logo */}
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                          {method.logoUrl ? (
                            <img
                              src={method.logoUrl.startsWith('/uploads') 
                                ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${method.logoUrl}`
                                : method.logoUrl}
                              alt={method.name}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <CreditCard className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{method.displayName}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {method.code}
                          </span>
                          {method.isInstant && (
                            <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                              <Zap className="w-3 h-3" />
                              Instantâneo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{method.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {method.processingTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {method.processingTime}
                            </span>
                          )}
                          {method.requiresPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Telefone
                            </span>
                          )}
                          {method.requiresEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Email
                            </span>
                          )}
                          {method.requiresReference && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Referência
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive.mutate({ id: method.id, isActive: !method.isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            method.isActive
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={method.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {method.isActive ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(method)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Método de Pagamento</h3>
                <button
                  onClick={cancelEditing}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Logo Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 relative">
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
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Logotipo
                      </label>
                      {/* Toggle between URL and Upload */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('url')}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            logoInputMode === 'url'
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
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
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* URL Input */}
                  {logoInputMode === 'url' && (
                    <div>
                      <input
                        type="url"
                        value={formData.logoUrl?.startsWith('/uploads') ? '' : (formData.logoUrl || '')}
                        onChange={(e) => updateFormField('logoUrl', e.target.value || null)}
                        placeholder="https://exemplo.com/logo.png"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cole o URL de uma imagem externa
                      </p>
                    </div>
                  )}

                  {/* Upload Input */}
                  {logoInputMode === 'upload' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingLogo
                            ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
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
                            <span className="text-gray-600 dark:text-gray-300">Clique para selecionar imagem</span>
                          </>
                        )}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        JPG, PNG, GIF, WebP ou SVG. Máximo 5MB. Recomendado: 128x128px
                      </p>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Código <span className="text-gray-400 dark:text-gray-500">(não editável)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Interno
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={formData.displayName || ''}
                    onChange={(e) => updateFormField('displayName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tempo de Processamento
                    </label>
                    <input
                      type="text"
                      value={formData.processingTime || ''}
                      onChange={(e) => updateFormField('processingTime', e.target.value)}
                      placeholder="Ex: Imediato, 1-5 minutos"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder || 0}
                      onChange={(e) => updateFormField('displayOrder', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tempo de Espera (segundos)
                    </label>
                    <input
                      type="number"
                      value={formData.waitTimeSeconds || 60}
                      onChange={(e) => updateFormField('waitTimeSeconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tempo Máximo (segundos)
                    </label>
                    <input
                      type="number"
                      value={formData.maxWaitTimeSeconds || 3600}
                      onChange={(e) => updateFormField('maxWaitTimeSeconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Configurações</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'isInstant', label: 'Pagamento Instantâneo', icon: Zap },
                      { key: 'requiresPhone', label: 'Requer Telefone', icon: Phone },
                      { key: 'requiresEmail', label: 'Requer Email', icon: Mail },
                      { key: 'requiresReference', label: 'Gera Referência', icon: FileText },
                    ].map(({ key, label, icon: Icon }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={(formData as any)[key] || false}
                          onChange={(e) => updateFormField(key as keyof PaymentMethod, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMethod.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMethod.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
