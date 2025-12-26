import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, Moon, Sun, User, LogOut, Menu, X, Users, Mail } from 'lucide-react';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useMySubscription } from '../../hooks/use-subscription';
import { OrganizationSelector } from '../organization-selector';

// Badge configuration based on subscription status
const getSubscriptionBadge = (subscription: any) => {
  if (!subscription) {
    return { label: 'Grátis', color: 'bg-gray-500' };
  }
  
  const { status, plan } = subscription;
  
  if (status === 'trial') {
    return { label: 'Teste', color: 'bg-blue-500' };
  }
  
  if (status === 'active' && plan) {
    const planType = plan.type?.toLowerCase();
    if (planType === 'enterprise') {
      return { label: 'Enterprise', color: 'bg-purple-500' };
    }
    if (planType === 'premium') {
      return { label: 'Premium', color: 'bg-yellow-500' };
    }
    if (planType === 'basic') {
      return { label: 'Básico', color: 'bg-green-500' };
    }
    return { label: plan.name, color: 'bg-green-500' };
  }
  
  if (status === 'expired') {
    return { label: 'Expirado', color: 'bg-red-500' };
  }
  
  if (status === 'cancelled') {
    return { label: 'Cancelado', color: 'bg-gray-500' };
  }
  
  if (status === 'pending') {
    return { label: 'Pendente', color: 'bg-yellow-500' };
  }
  
  return { label: 'Grátis', color: 'bg-gray-500' };
};

export function NavigationHeader() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { data: subscription } = useMySubscription();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFinanceiroMenu, setShowFinanceiroMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileFinanceiro, setShowMobileFinanceiro] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const badge = getSubscriptionBadge(subscription);

  const isActive = (path: string) => location === path;
  const isFinanceiroActive = () =>
    ['/accounts', '/savings-goals', '/loans', '/debts'].includes(location);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
        setShowFinanceiroMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowMobileFinanceiro(false);
  }, [location]);

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
    setShowMobileFinanceiro(false);
  };

  return (
    <header
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      ref={headerRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard">
              <div className="flex items-center cursor-pointer">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  FinanceControl
                </span>
                <span className={`ml-2 ${badge.color} text-white text-xs px-2 py-1 rounded-full`}>
                  {badge.label}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Menu */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link href="/dashboard">
              <span
                className={`cursor-pointer py-2 border-b-2 transition-colors ${
                  isActive('/dashboard')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dashboard
              </span>
            </Link>

            <Link href="/transactions">
              <span
                className={`cursor-pointer py-2 border-b-2 transition-colors ${
                  isActive('/transactions')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Transações
              </span>
            </Link>

            {/* Financeiro Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFinanceiroMenu(!showFinanceiroMenu)}
                className={`flex items-center cursor-pointer py-2 border-b-2 transition-colors ${
                  isFinanceiroActive()
                    ? 'text-blue-600 border-blue-600'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Financeiro
                <ChevronDown className="ml-1 w-4 h-4" />
              </button>

              {showFinanceiroMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <Link href="/accounts">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      Contas
                    </div>
                  </Link>
                  <Link href="/savings-goals">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      Poupança
                    </div>
                  </Link>
                  <Link href="/loans">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      Empréstimos e Dívidas
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/reports">
              <span
                className={`cursor-pointer py-2 border-b-2 transition-colors ${
                  isActive('/reports')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Relatórios
              </span>
            </Link>

            <Link href="/categories">
              <span
                className={`cursor-pointer py-2 border-b-2 transition-colors ${
                  isActive('/categories')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Categorias
              </span>
            </Link>

            <Link href="/subscription">
              <span
                className={`cursor-pointer py-2 border-b-2 transition-colors ${
                  isActive('/subscription')
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Assinatura
              </span>
            </Link>
          </nav>

          {/* Right side - Mobile menu button, Theme toggle and User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Organization Selector - Desktop */}
            <div className="hidden md:block">
              <OrganizationSelector variant="compact" />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <User className="w-5 h-5" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <Link href="/profile">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                      Perfil
                    </div>
                  </Link>
                  <Link href="/team">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Equipe
                    </div>
                  </Link>
                  <Link href="/invitations">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Convites Recebidos
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <nav className="px-4 py-3 space-y-1">
            {/* Organization Selector - Mobile */}
            <div className="pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
              <OrganizationSelector variant="full" />
            </div>

            <Link href="/dashboard" onClick={closeMobileMenu}>
              <div
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/dashboard')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Dashboard
              </div>
            </Link>

            <Link href="/transactions" onClick={closeMobileMenu}>
              <div
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/transactions')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Transações
              </div>
            </Link>

            {/* Financeiro Accordion */}
            <div>
              <button
                onClick={() => setShowMobileFinanceiro(!showMobileFinanceiro)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium ${
                  isFinanceiroActive()
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Financeiro
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showMobileFinanceiro ? 'rotate-180' : ''}`}
                />
              </button>

              {showMobileFinanceiro && (
                <div className="pl-4 mt-1 space-y-1">
                  <Link href="/accounts" onClick={closeMobileMenu}>
                    <div
                      className={`block px-3 py-2 rounded-md text-sm ${
                        isActive('/accounts')
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Contas
                    </div>
                  </Link>
                  <Link href="/savings-goals" onClick={closeMobileMenu}>
                    <div
                      className={`block px-3 py-2 rounded-md text-sm ${
                        isActive('/savings-goals')
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Poupança
                    </div>
                  </Link>
                  <Link href="/loans" onClick={closeMobileMenu}>
                    <div
                      className={`block px-3 py-2 rounded-md text-sm ${
                        isActive('/loans')
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Empréstimos e Dívidas
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/reports" onClick={closeMobileMenu}>
              <div
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/reports')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Relatórios
              </div>
            </Link>

            <Link href="/categories" onClick={closeMobileMenu}>
              <div
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/categories')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Categorias
              </div>
            </Link>

            <Link href="/subscription" onClick={closeMobileMenu}>
              <div
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/subscription')
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Assinatura
              </div>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
