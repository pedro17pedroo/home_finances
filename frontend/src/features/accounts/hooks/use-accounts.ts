import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../../../shared/api/accounts';
import type { CreateAccountRequest, UpdateAccountRequest } from '../../../shared/types';

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters: string) => [...accountKeys.lists(), { filters }] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: number) => [...accountKeys.details(), id] as const,
  summary: () => [...accountKeys.all, 'summary'] as const,
  savings: () => [...accountKeys.all, 'savings'] as const,
};

// Get all accounts
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: accountsApi.getAccounts,
  });
}

// Get savings accounts
export function useSavingsAccounts() {
  return useQuery({
    queryKey: accountKeys.savings(),
    queryFn: accountsApi.getSavingsAccounts,
  });
}

// Get account summary
export function useAccountSummary() {
  return useQuery({
    queryKey: accountKeys.summary(),
    queryFn: accountsApi.getAccountSummary,
  });
}

// Get specific account
export function useAccount(id: number) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => accountsApi.getAccountById(id),
    enabled: !!id,
  });
}

// Create account mutation
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => accountsApi.createAccount(data),
    onSuccess: () => {
      // Invalidate and refetch accounts
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

// Update account mutation
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAccountRequest }) =>
      accountsApi.updateAccount(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch accounts
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
    },
  });
}

// Delete account mutation
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => accountsApi.deleteAccount(id),
    onSuccess: () => {
      // Invalidate and refetch accounts
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}