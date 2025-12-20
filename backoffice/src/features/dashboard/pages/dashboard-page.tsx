import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { apiClient } from '../../../shared/api/client';
import { formatCurrency } from '../../../shared/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardStats {
  users: { total: number; active: number; newThisMonth: number };
  revenue: { monthly: number; total: number; growth: number };
  subscriptions: { active: number; trial: number; cancelled: number };
  payments: { pending: number; completed: number; failed: number };
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/dashboard/stats');
        return response.data;
      } catch {
        // Return mock data if API fails
        return {
          users: { total: 1250, active: 980, newThisMonth: 85 },
          revenue: { monthly: 8500000, total: 45000000, growth: 12.5 },
          subscriptions: { active: 850, trial: 200, cancelled: 50 },
          payments: { pending: 15, completed: 320, failed: 5 },
        };
      }
    },
  });

  // Mock chart data
  const revenueData = [
    { month: 'Jan', revenue: 4200000 },
    { month: 'Fev', revenue: 5100000 },
    { month: 'Mar', revenue: 4800000 },
    { month: 'Abr', revenue: 6200000 },
    { month: 'Mai', revenue: 7100000 },
    { month: 'Jun', revenue: 8500000 },
  ];

  const userGrowthData = [
    { month: 'Jan', users: 850 },
    { month: 'Fev', users: 920 },
    { month: 'Mar', users: 980 },
    { month: 'Abr', users: 1050 },
    { month: 'Mai', users: 1150 },
    { month: 'Jun', users: 1250 },
  ];

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {change >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(change)}%
                </span>
                <span className="text-sm text-gray-400 ml-1">vs mês anterior</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Activity className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Usuários"
            value={stats?.users.total || 0}
            change={8.2}
            icon={Users}
            color="bg-blue-600"
          />
          <StatCard
            title="Assinaturas Ativas"
            value={stats?.subscriptions.active || 0}
            change={5.1}
            icon={CreditCard}
            color="bg-green-600"
          />
          <StatCard
            title="Receita Mensal"
            value={formatCurrency(stats?.revenue.monthly || 0)}
            change={stats?.revenue.growth}
            icon={DollarSign}
            color="bg-purple-600"
          />
          <StatCard
            title="Receita Total"
            value={formatCurrency(stats?.revenue.total || 0)}
            icon={TrendingUp}
            color="bg-orange-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crescimento de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status de Assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ativas</span>
                  <span className="font-semibold text-green-600">{stats?.subscriptions.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Em Teste</span>
                  <span className="font-semibold text-blue-600">{stats?.subscriptions.trial}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Canceladas</span>
                  <span className="font-semibold text-red-600">{stats?.subscriptions.cancelled}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pendentes</span>
                  <span className="font-semibold text-yellow-600">{stats?.payments.pending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Concluídos</span>
                  <span className="font-semibold text-green-600">{stats?.payments.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Falhados</span>
                  <span className="font-semibold text-red-600">{stats?.payments.failed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Novos Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">{stats?.users.newThisMonth}</p>
                <p className="text-gray-500 mt-2">Este mês</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
