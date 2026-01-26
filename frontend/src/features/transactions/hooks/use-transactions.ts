import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, type TransactionFilters } from '../../../shared/api/transactions';
import type { CreateTransactionRequest } from '../../../shared/types';

export const TRANSACTIONS_QUERY_KEY = 'transactions';

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, 'list', filters],
    queryFn: async () => {
      const response = await transactionsApi.getAll(filters);
      return response.data.data!.transactions;
    },
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, 'detail', id],
    queryFn: async () => {
      const response = await transactionsApi.getById(id);
      return response.data.data!.transaction;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionRequest) => {
      const response = await transactionsApi.create(data);
      return response.data.data!.transaction;
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ 
        queryKey: [TRANSACTIONS_QUERY_KEY] 
      });
      // Invalidate accounts to update balances
      queryClient.invalidateQueries({ 
        queryKey: ['accounts'] 
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: Partial<CreateTransactionRequest> 
    }) => {
      const response = await transactionsApi.update(id, data);
      return response.data.data!.transaction;
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ 
        queryKey: [TRANSACTIONS_QUERY_KEY] 
      });
      // Invalidate accounts to update balances
      queryClient.invalidateQueries({ 
        queryKey: ['accounts'] 
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await transactionsApi.delete(id);
    },
    onSuccess: () => {
      // Invalidate and refetch transactions
      queryClient.invalidateQueries({ 
        queryKey: [TRANSACTIONS_QUERY_KEY] 
      });
      // Invalidate accounts to update balances
      queryClient.invalidateQueries({ 
        queryKey: ['accounts'] 
      });
    },
  });
}

export function useTransactionSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, 'summary', startDate, endDate],
    queryFn: async () => {
      const response = await transactionsApi.getSummary(startDate, endDate);
      return response.data.data!.summary;
    },
  });
}