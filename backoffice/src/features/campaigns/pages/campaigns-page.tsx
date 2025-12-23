import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Tag,
  Percent,
  DollarSign,
  Users,
  ToggleLeft,
  ToggleRight,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatCurrency } from '../../../shared/lib/utils';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount' | 'free_trial';
  discountValue: number | null;
  couponCode: string | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  applicablePlans: number[];
  minAmount: number;
  maxDiscount: number | null;
}

interface CampaignFormData {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_trial';
  discountValue: number;
  couponCode: string;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  applicablePlans: number[];
  minAmount: number;
  maxDiscount: number | null;
  isActive: boolean;
}

interface Plan {
  id: number;
  name: string;
}

const defaultCampaign: CampaignFormData = {
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  couponCode: '',
  validFrom: '',
  validUntil: '',
  usageLimit: null,
  applicablePlans: [],
  minAmount: 0,
  maxDiscount: null,
  isActive: true,
};

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(defaultCampaign);
  const [viewingUsage, setViewingUsage] = useState<Campaign | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['admin', 'campaigns'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/campaigns?includeInactive=true');
      return response.data.data || [];
    },
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['admin', 'plans-list'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/plans-v2');
      return response.data.data || [];
    },
  });

  const { data: usageData } = useQuery({
    queryKey: ['admin', 'campaign-usage', viewingUsage?.id],
    queryFn: async () => {
      if (!viewingUsage) return null;
      const response = await apiClient.get(`/admin/campaigns/${viewingUsage.id}/usage`);
      return response.data.data || [];
    },
    enabled: !!viewingUsage,
  });

  const saveCampaign = useMutation({
    mutationFn: async (data: CampaignFormData & { id?: number }) => {
      if (data.id) {
        await apiClient.put(`/admin/campaigns/${data.id}`, data);
      } else {
        await apiClient.post('/admin/campaigns', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
      closeModal();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Erro ao salvar campanha');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/admin/campaigns/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/admin/campaigns/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
    onError: (error: any) => {
      alert(error.message || 'Erro ao eliminar campanha');
    },
  });

  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        discountType: campaign.discountType,
        discountValue: campaign.discountValue || 0,
        couponCode: campaign.couponCode || '',
        validFrom: campaign.validFrom ? campaign.validFrom.split('T')[0] : '',
        validUntil: campaign.validUntil ? campaign.validUntil.split('T')[0] : '',
        usageLimit: campaign.usageLimit,
        applicablePlans: campaign.applicablePlans || [],
        minAmount: campaign.minAmount || 0,
        maxDiscount: campaign.maxDiscount,
        isActive: campaign.isActive,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        ...defaultCampaign,
        couponCode: generateCouponCode(),
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setFormData(defaultCampaign);
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCampaign.mutate(editingCampaign ? { ...formData, id: editingCampaign.id } : formData);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-AO');
  };

  const isExpired = (campaign: Campaign) => {
    if (!campaign.validUntil) return false;
    return new Date(campaign.validUntil) < new Date();
  };

  // Stats
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter(c => c.isActive && !isExpired(c)).length || 0;
  const totalUsage = campaigns?.reduce((sum, c) => sum + c.usageCount, 0) || 0;

  return (
    <AdminLayout title="Gestão de Campanhas">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Campanhas</p>
                  <p className="text-2xl font-bold">{totalCampaigns}</p>
                </div>
                <Tag className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Campanhas Activas</p>
                  <p className="text-2xl font-bold text-green-600">{activeCampaigns}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Utilizações</p>
                  <p className="text-2xl font-bold text-purple-600">{totalUsage}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Gerencie cupões de desconto e campanhas promocionais</p>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns?.map((campaign) => (
              <Card key={campaign.id} className={`${!campaign.isActive || isExpired(campaign) ? 'opacity-60 border-dashed' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-600" />
                        {campaign.name}
                      </CardTitle>
                      {campaign.couponCode && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {campaign.couponCode}
                          </code>
                          <button
                            onClick={() => copyCode(campaign.couponCode!)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {copiedCode === campaign.couponCode ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleStatus.mutate(campaign.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={campaign.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {campaign.isActive ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => setViewingUsage(campaign)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Ver utilizações"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => openModal(campaign)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja eliminar esta campanha?')) {
                            deleteCampaign.mutate(campaign.id);
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.description && (
                    <p className="text-sm text-gray-500 mb-3">{campaign.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Desconto:</span>
                      <span className="font-medium flex items-center">
                        {campaign.discountType === 'percentage' ? (
                          <>
                            <Percent className="w-4 h-4 mr-1 text-blue-500" />
                            {campaign.discountValue}%
                          </>
                        ) : campaign.discountType === 'fixed_amount' ? (
                          <>
                            <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                            {formatCurrency(campaign.discountValue || 0)}
                          </>
                        ) : (
                          'Trial Grátis'
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Utilizações:</span>
                      <span className="font-medium">
                        {campaign.usageCount}
                        {campaign.usageLimit && ` / ${campaign.usageLimit}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Validade:</span>
                      <span className={`font-medium ${isExpired(campaign) ? 'text-red-500' : ''}`}>
                        {campaign.validFrom || campaign.validUntil ? (
                          <>
                            {formatDate(campaign.validFrom)} - {formatDate(campaign.validUntil)}
                          </>
                        ) : (
                          'Sem limite'
                        )}
                      </span>
                    </div>
                  </div>

                  {(!campaign.isActive || isExpired(campaign)) && (
                    <div className="mt-4 text-center text-sm font-medium">
                      {isExpired(campaign) ? (
                        <span className="text-red-600">Expirada</span>
                      ) : (
                        <span className="text-gray-600">Inactiva</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                </h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código do Cupão</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.couponCode}
                        onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                        required
                      />
                      <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, couponCode: generateCouponCode() })}>
                        Gerar
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentagem (%)</option>
                      <option value="fixed_amount">Valor Fixo (Kz)</option>
                      <option value="free_trial">Trial Grátis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor do Desconto {formData.discountType === 'percentage' ? '(%)' : '(Kz)'}
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      disabled={formData.discountType === 'free_trial'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Válido De</label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Válido Até</label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limite de Utilizações
                      <span className="text-gray-400 font-normal ml-1">- vazio = ilimitado</span>
                    </label>
                    <input
                      type="number"
                      value={formData.usageLimit || ''}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo (Kz)</label>
                    <input
                      type="number"
                      value={formData.minAmount}
                      onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desconto Máximo (Kz)
                      <span className="text-gray-400 font-normal ml-1">- vazio = sem limite</span>
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount || ''}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planos Aplicáveis
                    <span className="text-gray-400 font-normal ml-1">- deixe vazio para todos</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {plans?.map((plan) => (
                      <label key={plan.id} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.applicablePlans.includes(plan.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, applicablePlans: [...formData.applicablePlans, plan.id] });
                            } else {
                              setFormData({ ...formData, applicablePlans: formData.applicablePlans.filter(id => id !== plan.id) });
                            }
                          }}
                        />
                        <span className="text-sm">{plan.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Campanha activa</label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
                  <Button type="submit" disabled={saveCampaign.isPending}>
                    {saveCampaign.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Usage Modal */}
        {viewingUsage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Utilizações - {viewingUsage.name}
                </h3>
                <button onClick={() => setViewingUsage(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Utilizações</p>
                    <p className="text-xl font-bold">{viewingUsage.usageCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Limite</p>
                    <p className="text-xl font-bold">{viewingUsage.usageLimit || '∞'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Disponível</p>
                    <p className="text-xl font-bold">
                      {viewingUsage.usageLimit ? viewingUsage.usageLimit - viewingUsage.usageCount : '∞'}
                    </p>
                  </div>
                </div>
              </div>

              {usageData && usageData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Utilizador</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Desconto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valor Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {usageData.map((usage: any) => (
                        <tr key={usage.id}>
                          <td className="px-4 py-2">
                            <p className="font-medium">{usage.userName}</p>
                            <p className="text-sm text-gray-500">{usage.userEmail}</p>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {formatDate(usage.usedAt)}
                          </td>
                          <td className="px-4 py-2 text-sm text-green-600">
                            -{formatCurrency(usage.discountAmount || 0)}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(usage.finalPrice || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhuma utilização registada</p>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewingUsage(null)}>
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
