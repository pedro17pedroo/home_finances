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
  UserCog,
  Smartphone,
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
  { id: 'users', label: 'Utilizadores', icon: <Users className="w-5 h-5" />, path: '/users' },
  { id: 'admins', label: 'Administradores', icon: <UserCog className="w-5 h-5" />, path: '/admins', permission: 'super_admin' },
  { id: 'plans', label: 'Planos', icon: <Package className="w-5 h-5" />, path: '/plans' },
  { id: 'subscriptions', label: 'Assinaturas', icon: <Repeat className="w-5 h-5" />, path: '/subscriptions' },
  { id: 'campaigns', label: 'Campanhas', icon: <Tag className="w-5 h-5" />, path: '/campaigns' },
  { id: 'payments', label: 'Pagamentos', icon: <CreditCard className="w-5 h-5" />, path: '/payments' },
  { id: 'payment-methods', label: 'Métodos Pagamento', icon: <Wallet className="w-5 h-5" />, path: '/payment-methods' },
  { id: 'banks', label: 'Bancos', icon: <Building2 className="w-5 h-5" />, path: '/banks' },
  { id: 'account-types', label: 'Tipos de Conta', icon: <Wallet className="w-5 h-5" />, path: '/account-types' },
  { id: 'reports', label: 'Relatórios', icon: <BarChart3 className="w-5 h-5" />, path: '/reports' },
  { id: 'content', label: 'Conteúdo', icon: <FileText className="w-5 h-5" />, path: '/content' },
  { id: 'notifications', label: 'Notificações', icon: <Bell className="w-5 h-5" />, path: '/notifications' },
  { id: 'app-downloads', label: 'Apps Mobile', icon: <Smartphone className="w-5 h-5" />, path: '/app-downloads' },
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
      className={`bg-gray-900 text-white h-screen flex flex-col transition-all duration-300 flex-shrink-0 border-r border-gray-700 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`h-16 border-b border-gray-800 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center">
            <span className="text-2xl">🔧</span>
            <span className="ml-2 font-bold">Backoffice</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {filteredItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            return (
              <li key={item.id}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center rounded-lg cursor-pointer transition-colors group relative ${
                      collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                    
                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-sm rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg border border-gray-700">
                        {item.label}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className={`border-t border-gray-800 ${collapsed ? 'p-2' : 'p-4'}`}>
        {!collapsed && admin && (
          <div className="mb-3">
            <p className="text-sm font-medium">{admin.firstName} {admin.lastName}</p>
            <p className="text-xs text-gray-400">{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors group relative ${
            collapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-3 py-2'
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="ml-3">Sair</span>}
          
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-sm rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg border border-gray-700">
              Sair
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
