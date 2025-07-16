import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Users, DollarSign, Target, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('revenue');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/admin/analytics', timeRange, metric],
    queryFn: () => fetch(`/api/admin/analytics?range=${timeRange}&metric=${metric}`).then(res => res.json()),
    throwOnError: false,
  });

  const { data: conversionsData } = useQuery({
    queryKey: ['/api/admin/analytics/conversions', timeRange],
    queryFn: () => fetch(`/api/admin/analytics/conversions?range=${timeRange}`).then(res => res.json()),
    throwOnError: false,
  });

  const { data: churnData } = useQuery({
    queryKey: ['/api/admin/analytics/churn', timeRange],
    queryFn: () => fetch(`/api/admin/analytics/churn?range=${timeRange}`).then(res => res.json()),
    throwOnError: false,
  });

  const { data: cohortData } = useQuery({
    queryKey: ['/api/admin/analytics/cohort', timeRange],
    queryFn: () => fetch(`/api/admin/analytics/cohort?range=${timeRange}`).then(res => res.json()),
    throwOnError: false,
  });

  const exportReport = () => {
    window.open(`/api/admin/analytics/export?range=${timeRange}&format=csv`, '_blank');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Avançadas</h1>
            <p className="text-muted-foreground">
              Análise detalhada de métricas de negócio e performance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.totalRevenue?.toLocaleString('pt-AO', { 
                  style: 'currency', 
                  currency: 'AOA' 
                }) || 'Kz 0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData?.revenueGrowth > 0 ? '+' : ''}{analyticsData?.revenueGrowth}% do período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.conversionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData?.conversionGrowth > 0 ? '+' : ''}{analyticsData?.conversionGrowth}% do período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.avgLTV?.toLocaleString('pt-AO', { 
                  style: 'currency', 
                  currency: 'AOA' 
                }) || 'Kz 0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData?.ltvGrowth > 0 ? '+' : ''}{analyticsData?.ltvGrowth}% do período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.churnRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData?.churnChange > 0 ? '+' : ''}{analyticsData?.churnChange}% do período anterior
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="conversions">Conversões</TabsTrigger>
            <TabsTrigger value="churn">Churn</TabsTrigger>
            <TabsTrigger value="cohort">Análise de Coorte</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Receita</CardTitle>
                <CardDescription>
                  Receita mensal nos últimos {timeRange === '7d' ? '7 dias' : timeRange === '30d' ? '30 dias' : timeRange === '90d' ? '90 dias' : '12 meses'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.revenueChart || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [
                        new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value as number),
                        'Receita'
                      ]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={analyticsData?.revenueByPlan || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${(value as number).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analyticsData?.revenueByPlan || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tendências de MRR</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analyticsData?.mrrTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="mrr" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Crescimento de Utilizadores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="totalUsers" stroke="#8884d8" name="Total" />
                    <Line type="monotone" dataKey="activeUsers" stroke="#82ca9d" name="Ativos" />
                    <Line type="monotone" dataKey="trialUsers" stroke="#ffc658" name="Trial" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conversionsData?.funnel?.map((step, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{step.stage}</span>
                          <span className="text-sm text-muted-foreground">
                            {step.count} ({step.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${step.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Churn</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={churnData?.monthly || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="churnRate" stroke="#ff7c7c" name="Taxa de Churn %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Motivos de Cancelamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnData?.reasons?.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{reason.reason}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${reason.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {reason.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohort" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Coorte - Retenção</CardTitle>
                <CardDescription>
                  Percentual de utilizadores que permanecem ativos por mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Coorte</th>
                        <th className="text-center p-2">Mês 0</th>
                        <th className="text-center p-2">Mês 1</th>
                        <th className="text-center p-2">Mês 2</th>
                        <th className="text-center p-2">Mês 3</th>
                        <th className="text-center p-2">Mês 4</th>
                        <th className="text-center p-2">Mês 5</th>
                        <th className="text-center p-2">Mês 6</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData?.cohorts?.map((cohort, index) => (
                        <tr key={index}>
                          <td className="p-2 font-medium">{cohort.month}</td>
                          {cohort.retention.map((rate, rIndex) => (
                            <td key={rIndex} className="text-center p-2">
                              <span 
                                className={`px-2 py-1 rounded text-white text-xs ${
                                  rate >= 80 ? 'bg-green-500' :
                                  rate >= 60 ? 'bg-yellow-500' :
                                  rate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}