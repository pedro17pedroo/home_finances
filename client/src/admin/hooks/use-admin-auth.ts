import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AdminUser } from '../types/admin';

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ['/api/admin/auth/me'],
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      const res = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch admin user');
      }
      return res.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiRequest('POST', '/api/admin/auth/login', credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/admin/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}