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
}

interface PlanFormData {
  name: string;
  type: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
}

const defaultPlan: PlanFormData = {
  name: '',
  type: 'basic',
  price: 0,
  features: [],
  maxAccounts: 5,
  maxTransactions: 100,
  isActive: true,
};

export function PlansPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlan);
  const [newFeature, setNewFeature] = useState('');

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/plans');
        return response.data;
      } catch {
        return [
          { id: 1, name: 'Gratuito', type: 'free', price: 0, features: ['1 conta', '50 transações/mês', 'Relatórios básicos'], maxAccounts: 1, maxTransactions: 50, isActive: true },
          { id: 2, name: 'Básico', type: 'basic', price: 2500, features: ['3 contas', '200 transações/mês', 'Relatórios avançados', 'Suporte por email'], maxAccounts: 3, maxTransactions: 200, isActive: true },
          { id: 3, name: 'Premium', type: 'premium', price: 5000, features: ['10 contas', 'Transações ilimitadas', 'Todos os relatórios', 'Suporte prioritário', 'API access'], maxAccounts: 10, maxTransactions: -1, isActive: true },
        ];
      }
    },
  });

  const savePlan = useMutation({
    mutationFn: async (data: PlanFormData & { id?: number }) => {
      if (data.id) {
        await apiClient.put(`/admin/plans/${data.id}`, data);
      } else {
        await apiClient.post('/admin/plans', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      closeModal();
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });

  const openModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        type: plan.type,
        price: plan.price,
        features: plan.features,
        maxAccounts: plan.maxAccounts,
        maxTransactions: plan.maxTransactions,
        isActive: plan.isActive,
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

  return (
    <AdminLayout title="Gestão de Planos">
      <div className="space-y-6">
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
              <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        {plan.name}
                      </CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${
                        plan.type === 'free' ? 'bg-gray-100 text-gray-800' :
                        plan.type === 'basic' ? 'bg-blue-100 text-blue-800' :
                        plan.type === 'premium' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openModal(plan)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => deletePlan.mutate(plan.id)}
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
                      {plan.price > 0 && <span className="text-gray-500 ml-1">/mês</span>}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {plan.maxAccounts} contas
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      {plan.maxTransactions === -1 ? 'Transações ilimitadas' : `${plan.maxTransactions} transações/mês`}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!plan.isActive && (
                    <div className="mt-4 text-center text-sm text-red-600 font-medium">
                      Plano Inativo
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
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                </h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <option value="free">Gratuito</option>
                    <option value="basic">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Transações</label>
                    <input
                      type="number"
                      value={formData.maxTransactions}
                      onChange={(e) => setFormData({ ...formData, maxTransactions: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="-1"
                      placeholder="-1 para ilimitado"
                    />
                  </div>
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
                  <ul className="space-y-1">
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
                  <label htmlFor="isActive" className="text-sm text-gray-700">Plano ativo</label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
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
