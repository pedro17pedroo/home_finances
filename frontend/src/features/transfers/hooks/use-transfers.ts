import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersApi } from '../../../shared/api/transfers';
import type { CreateTransferRequest } from '../../../shared/types';

// Query keys
export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (filters: string) => [...transferKeys.lists(), { filters }] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: number) => [...transferKeys.details(), id] as const,
  summary: () => [...transferKeys.all, 'summary'] as const,
  account: (accountId: number) => [...transferKeys.all, 'account', accountId] as const,
};

// Get all transfers
export function useTransfers(filters?: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  return useQuery({
    queryKey: transferKeys.list(JSON.stringify(filters || {})),
    queryFn: () => transfersApi.getTransfers(filters),
  });
}

// Get transfer summary
export function useTransferSummary() {
  return useQuery({
    queryKey: transferKeys.summary(),
    queryFn: transfersApi.getTransferSummary,
  });
}

// Get transfers for specific account
export function useAccountTransfers(accountId: number) {
  return useQuery({
    queryKey: transferKeys.account(accountId),
    queryFn: () => transfersApi.getAccountTransfers(accountId),
    enabled: !!accountId,
  });
}

// Get specific transfer
export function useTransfer(id: number) {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => transfersApi.getTransferById(id),
    enabled: !!id,
  });
}

// Create transfer mutation
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferRequest) => transfersApi.createTransfer(data),
    onSuccess: () => {
      // Invalidate and refetch transfers and accounts
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Reverse transfer mutation
export function useReverseTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transfersApi.reverseTransfer(id),
    onSuccess: () => {
      // Invalidate and refetch transfers and accounts
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}