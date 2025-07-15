import { ReactNode } from 'react';
import { useAdminAuth } from '../../hooks/use-admin-auth';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { useLocation } from 'wouter';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/admin/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}