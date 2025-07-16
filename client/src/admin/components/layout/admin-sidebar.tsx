import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  FileText,
  BarChart3,
  Shield,
  LogOut,
  Wallet,
  Gift,
  Globe,
  Scale,
  CheckCircle
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/use-admin-auth';
import { hasPermission } from '../../lib/permissions';
import { ADMIN_PERMISSIONS } from '../../lib/permissions';

export function AdminSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAdminAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      permission: null,
    },
    {
      name: 'Utilizadores',
      href: '/admin/users',
      icon: Users,
      permission: ADMIN_PERMISSIONS.USERS.VIEW,
    },
    {
      name: 'Planos',
      href: '/admin/plans',
      icon: CreditCard,
      permission: ADMIN_PERMISSIONS.PLANS.VIEW,
    },
    {
      name: 'Métodos de Pagamento',
      href: '/admin/payment-methods',
      icon: Wallet,
      permission: ADMIN_PERMISSIONS.PAYMENTS.VIEW,
    },
    {
      name: 'Aprovar Pagamentos',
      href: '/admin/payment-approvals',
      icon: CheckCircle,
      permission: ADMIN_PERMISSIONS.PAYMENTS.APPROVE,
    },
    {
      name: 'Campanhas',
      href: '/admin/campaigns',
      icon: Gift,
      permission: ADMIN_PERMISSIONS.CAMPAIGNS.VIEW,
    },
    {
      name: 'Conteúdo Landing',
      href: '/admin/landing-content',
      icon: Globe,
      permission: ADMIN_PERMISSIONS.CONTENT.MANAGE_LANDING,
    },
    {
      name: 'Conteúdo Legal',
      href: '/admin/legal-content',
      icon: Scale,
      permission: ADMIN_PERMISSIONS.CONTENT.MANAGE_LEGAL,
    },
    {
      name: 'Configurações',
      href: '/admin/system-settings',
      icon: Settings,
      permission: ADMIN_PERMISSIONS.SYSTEM.VIEW_SETTINGS,
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      permission: ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS,
    },
    {
      name: 'Logs de Auditoria',
      href: '/admin/audit-logs',
      icon: FileText,
      permission: ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS,
    },
    {
      name: 'Logs de Segurança',
      href: '/admin/security-logs',
      icon: Shield,
      permission: ADMIN_PERMISSIONS.SYSTEM.VIEW_LOGS,
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.permission || hasPermission(user?.permissions || [], item.permission)
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Admin Panel
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
          {user?.role.replace('_', ' ')}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);

          return (
            <Link key={item.name} href={item.href}>
              <div className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}