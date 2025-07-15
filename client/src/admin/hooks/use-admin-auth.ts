import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AdminUser } from '../types/admin';

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ['/api/admin/auth/me'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiRequest('/api/admin/auth/login', {
        method: 'POST',
        body: credentials,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/admin/auth/logout', {
        method: 'POST',
      }),
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