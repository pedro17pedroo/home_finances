import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Bell,
  Package,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Tag,
  Wallet,
  Building2,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/admin-auth-context';
import { useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
  { id: 'users', label: 'Usuários', icon: <Users className="w-5 h-5" />, path: '/users' },
  { id: 'plans', label: 'Planos', icon: <Package className="w-5 h-5" />, path: '/plans' },
  { id: 'subscriptions', label: 'Assinaturas', icon: <Repeat className="w-5 h-5" />, path: '/subscriptions' },
  { id: 'campaigns', label: 'Campanhas', icon: <Tag className="w-5 h-5" />, path: '/campaigns' },
  { id: 'payments', label: 'Pagamentos', icon: <CreditCard className="w-5 h-5" />, path: '/payments' },
  { id: 'payment-methods', label: 'Métodos Pagamento', icon: <Wallet className="w-5 h-5" />, path: '/payment-methods' },
  { id: 'banks', label: 'Bancos', icon: <Building2 className="w-5 h-5" />, path: '/banks' },
  { id: 'reports', label: 'Relatórios', icon: <BarChart3 className="w-5 h-5" />, path: '/reports' },
  { id: 'content', label: 'Conteúdo', icon: <FileText className="w-5 h-5" />, path: '/content' },
  { id: 'notifications', label: 'Notificações', icon: <Bell className="w-5 h-5" />, path: '/notifications' },
  { id: 'security', label: 'Segurança', icon: <Shield className="w-5 h-5" />, path: '/security', permission: 'security' },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" />, path: '/settings' },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { admin, logout, hasPermission } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={`bg-gray-900 text-white h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center">
            <span className="text-2xl">🔧</span>
            <span className="ml-2 font-bold">Backoffice</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-800 rounded"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            return (
              <li key={item.id}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {!collapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed && admin && (
          <div className="mb-3">
            <p className="text-sm font-medium">{admin.firstName} {admin.lastName}</p>
            <p className="text-xs text-gray-400">{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
