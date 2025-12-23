import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Package,
  DollarSign,
  Clock,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatCurrency } from '../../../shared/lib/utils';

interface Plan {
  id: number;
  name: string;
  type: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
  durationDays: number | null;
  trialDays: number;
  billingCycle: string;
  description: string | null;
  sortOrder: number;
}

interface PlanFormData {
  name: string;
  type: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
  durationDays: number | null;
  trialDays: number;
  billingCycle: string;
  description: string;
  sortOrder: number;
}

const defaultPlan: PlanFormData = {
  name: '',
  type: 'basic',
  price: 0,
  features: [],
  maxAccounts: 5,
  maxTransactions: 100,
  isActive: true,
  durationDays: 30,
  trialDays: 0,
  billingCycle: 'monthly',
  description: '',
  sortOrder: 0,
};

const billingCycleLabels: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  one_time: 'Único',
};

export function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlan);
  const [newFeature, setNewFeature] = useState('');

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['admin', 'plans-v2'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/plans-v2?includeInactive=true');
      return response.data.data || [];
    },
  });

  const savePlan = useMutation({
    mutationFn: async (data: PlanFormData & { id?: number }) => {
      if (data.id) {
        await apiClient.put(`/admin/plans-v2/${data.id}`, data);
      } else {
        await apiClient.post('/admin/plans-v2', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans-v2'] });
      closeModal();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/admin/plans-v2/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans-v2'] });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/admin/plans-v2/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans-v2'] });
    },
    onError: (error: any) => {
      alert(error.message || 'Erro ao eliminar plano');
    },
  });

  const openModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        type: plan.type,
        price: plan.price,
        features: plan.features || [],
        maxAccounts: plan.maxAccounts,
        maxTransactions: plan.maxTransactions,
        isActive: plan.isActive,
        durationDays: plan.durationDays,
        trialDays: plan.trialDays || 0,
        billingCycle: plan.billingCycle || 'monthly',
        description: plan.description || '',
        sortOrder: plan.sortOrder || 0,
      });
    } else {
      setEditingPlan(null);
      setFormData(defaultPlan);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(defaultPlan);
    setNewFeature('');
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePlan.mutate(editingPlan ? { ...formData, id: editingPlan.id } : formData);
  };

  // Stats
  const totalPlans = plans?.length || 0;
  const activePlans = plans?.filter(p => p.isActive).length || 0;
  const plansWithTrial = plans?.filter(p => p.trialDays > 0).length || 0;

  return (
    <AdminLayout title="Gestão de Planos">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total de Planos</p>
                  <p className="text-2xl font-bold">{totalPlans}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Planos Activos</p>
                  <p className="text-2xl font-bold text-green-600">{activePlans}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Com Período de Teste</p>
                  <p className="text-2xl font-bold text-purple-600">{plansWithTrial}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Gerencie os planos de assinatura da plataforma</p>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <Card key={plan.id} className={!plan.isActive ? 'opacity-60 border-dashed' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        {plan.name}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          plan.type === 'basic' ? 'bg-blue-100 text-blue-800' :
                          plan.type === 'premium' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {plan.type === 'basic' ? 'Básico' : 
                           plan.type === 'premium' ? 'Premium' : 'Enterprise'}
                        </span>
                        {plan.trialDays > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            {plan.trialDays} dias trial
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleStatus.mutate(plan.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={plan.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {plan.isActive ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(plan)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja eliminar este plano?')) {
                            deletePlan.mutate(plan.id);
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
                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 ml-1">
                          /{billingCycleLabels[plan.billingCycle] || 'mês'}
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    )}
                  </div>
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {plan.maxAccounts} contas
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {plan.maxTransactions === -1 ? 'Transações ilimitadas' : `${plan.maxTransactions} transações/mês`}
                    </div>
                    {plan.durationDays && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Duração: {plan.durationDays} dias
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features?.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features?.length > 4 && (
                      <li className="text-sm text-gray-400">
                        +{plan.features.length - 4} mais funcionalidades
                      </li>
                    )}
                  </ul>
                  {!plan.isActive && (
                    <div className="mt-4 text-center text-sm text-red-600 font-medium">
                      Plano Inactivo
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="basic">Básico</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Descrição breve do plano"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço (Kz)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo de Facturação</label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                      <option value="one_time">Pagamento Único</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duração (dias)
                      <span className="text-gray-400 font-normal ml-1">- deixe vazio para ilimitado</span>
                    </label>
                    <input
                      type="number"
                      value={formData.durationDays || ''}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Período de Teste (dias)
                      <span className="text-gray-400 font-normal ml-1">- 0 para sem trial</span>
                    </label>
                    <input
                      type="number"
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="Ex: 7"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Contas</label>
                    <input
                      type="number"
                      value={formData.maxAccounts}
                      onChange={(e) => setFormData({ ...formData, maxAccounts: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máx. Transações
                      <span className="text-gray-400 font-normal ml-1">- -1 para ilimitado</span>
                    </label>
                    <input
                      type="number"
                      value={formData.maxTransactions}
                      onChange={(e) => setFormData({ ...formData, maxTransactions: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de Exibição</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Funcionalidades</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nova funcionalidade"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature}>Adicionar</Button>
                  </div>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {formData.features.map((feature, index) => (
                      <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">{feature}</span>
                        <button type="button" onClick={() => removeFeature(index)} className="text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Plano activo</label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
                  <Button type="submit" disabled={savePlan.isPending}>
                    {savePlan.isPending ? 'Salvando...' : 'Salvar'}
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
