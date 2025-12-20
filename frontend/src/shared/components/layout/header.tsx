import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '../../contexts/auth-context';
import { NotificationBell } from '../notifications/notification-bell';
import { Button } from '../ui/button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard">
            <div className="flex items-center cursor-pointer">
              <span className="text-2xl font-bold text-blue-600">💰</span>
              <span className="ml-2 text-xl font-bold text-gray-900">FinanceControl</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/dashboard">
              <span className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                Dashboard
              </span>
            </Link>
            <Link href="/accounts">
              <span className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                Contas
              </span>
            </Link>
            <Link href="/transactions">
              <span className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                Transações
              </span>
            </Link>
            <Link href="/reports">
              <span className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                Relatórios
              </span>
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <NotificationBell />
            
            {/* User menu */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">
                Olá, {user?.firstName || 'Usuário'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}