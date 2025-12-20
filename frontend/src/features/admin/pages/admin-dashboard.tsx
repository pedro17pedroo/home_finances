import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data - em produção, usar APIs reais
  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      // Mock API call
      return {
        users: {
          total: 1250,
          active: 980,
          byPlan: [
            { planType: 'basic', subscriptionStatus: 'active', count: 650 },
            { planType: 'premium', subscriptionStatus: 'active', count: 280 },
            { planType: 'enterprise', subscriptionStatus: 'active', count: 50 }
          ]
        },
        plans: {
          total: 3,
          active: 3,
          list: [
            { id: 1, name: 'Básico', price: '0', isActive: true },
            { id: 2, name: 'Premium', price: '15000', isActive: true },
            { id: 3, name: 'Enterprise', price: '50000', isActive: true }
          ]
        },
        revenue: {
          monthly: 8500000, // AOA
          total: 45000000
        }
      };
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600">Total de Usuários</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.users.total || 0}</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600">Usuários Ativos</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.users.active || 0}</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600">Receita Mensal</h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.revenue.monthly ? formatCurrency(stats.revenue.monthly) : 'AOA 0'}
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-600">Receita Total</h3>
          <p className="text-3xl font-bold text-orange-600">
            {stats?.revenue.total ? formatCurrency(stats.revenue.total) : 'AOA 0'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Usuários por Plano</h3>
          <div className="space-y-3">
            {stats?.users.byPlan.map((plan, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="capitalize">{plan.planType}</span>
                <span className="font-semibold">{plan.count} usuários</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
          <div className="space-y-3">
            {stats?.plans.list.map((plan) => (
              <div key={plan.id} className="flex justify-between items-center">
                <span>{plan.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">
                    {plan.price === '0' ? 'Grátis' : formatCurrency(parseInt(plan.price))}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderPlans = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Planos</h2>
        <Button>Novo Plano</Button>
      </div>
      
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Nome</th>
                <th className="text-left py-2">Preço</th>
                <th className="text-left py-2">Contas Máx</th>
                <th className="text-left py-2">Transações Máx</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stats?.plans.list.map((plan) => (
                <tr key={plan.id} className="border-b">
                  <td className="py-3">{plan.name}</td>
                  <td className="py-3">
                    {plan.price === '0' ? 'Grátis' : formatCurrency(parseInt(plan.price))}
                  </td>
                  <td className="py-3">-</td>
                  <td className="py-3">-</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">Editar</Button>
                      <Button size="sm" variant="outline">
                        {plan.isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
      
      <Card className="p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar usuários..."
            className="w-full p-3 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Nome</th>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Plano</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Criado em</th>
                <th className="text-left py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock data */}
              <tr className="border-b">
                <td className="py-3">João Silva</td>
                <td className="py-3">joao@email.com</td>
                <td className="py-3">Premium</td>
                <td className="py-3">
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Ativo
                  </span>
                </td>
                <td className="py-3">15/12/2025</td>
                <td className="py-3">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">Ver</Button>
                    <Button size="sm" variant="outline">Editar</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">🔧</span>
              <span className="ml-2 text-xl font-bold text-gray-900">Admin FinanceControl</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Admin</span>
              <Button variant="outline" size="sm">Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'users', label: 'Usuários' },
              { id: 'plans', label: 'Planos' },
              { id: 'content', label: 'Conteúdo' },
              { id: 'settings', label: 'Configurações' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'plans' && renderPlans()}
        {activeTab === 'content' && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gestão de Conteúdo</h3>
            <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Configurações</h3>
            <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
          </div>
        )}
      </div>
    </div>
  );
}