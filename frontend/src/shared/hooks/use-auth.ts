import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';

export const AUTH_QUERY_KEY = 'auth';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await authApi.login(data);
      return response.data.data!;
    },
    onSuccess: (data) => {
      // Store auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update query cache
      queryClient.setQueryData([AUTH_QUERY_KEY, 'user'], data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await authApi.register(data);
      return response.data.data!;
    },
    onSuccess: (data) => {
      // Store auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update query cache
      queryClient.setQueryData([AUTH_QUERY_KEY, 'user'], data.user);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: [AUTH_QUERY_KEY, 'user'],
    queryFn: async () => {
      const response = await authApi.getCurrentUser();
      return response.data.data!.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<any>) => {
      const response = await authApi.updateProfile(data);
      return response.data.data!.user;
    },
    onSuccess: (user) => {
      // Update local storage
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update query cache
      queryClient.setQueryData([AUTH_QUERY_KEY, 'user'], user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await authApi.changePassword(data);
      return response.data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear query cache
      queryClient.clear();
      
      // Redirect to login
      window.location.href = '/login';
    },
  });
}