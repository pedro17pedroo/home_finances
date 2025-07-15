import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Shield, 
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Check authentication
  const { data: adminUser, isLoading: authLoading } = useQuery({
    queryKey: ['/api/admin/auth/me'],
    retry: false
  });

  // Get dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/stats'],
    enabled: !!adminUser,
    retry: false
  });

  // Redirect if not authenticated
  if (!authLoading && !adminUser) {
    navigate('/admin/login');
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      toast({
        title: "Logout efetuado",
        description: "Até logo!"
      });
      
      navigate('/admin/login');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Painel Administrativo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  FinanceControl - Sistema de Gestão
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {adminUser?.firstName} {adminUser?.lastName}
                </p>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={adminUser?.role === 'super_admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bem-vindo, {adminUser?.firstName}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aqui está um resumo do sistema financeiro FinanceControl
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilizadores Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Mensal
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.monthlyRevenue || '0'} Kz
              </div>
              <p className="text-xs text-muted-foreground">
                +8% em relação ao mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Subscriptions Ativas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeSubscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +23% em relação ao mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sistema Status
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Operacional</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os sistemas funcionais
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestão de Utilizadores</span>
              </CardTitle>
              <CardDescription>
                Gerir utilizadores, subscrições e permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate('/admin/users')}
              >
                Gerir Utilizadores
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Gestão de Planos</span>
              </CardTitle>
              <CardDescription>
                Configurar planos, preços e funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate('/admin/plans')}
              >
                Gerir Planos
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações</span>
              </CardTitle>
              <CardDescription>
                Configurações do sistema e parâmetros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate('/admin/settings')}
              >
                Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}