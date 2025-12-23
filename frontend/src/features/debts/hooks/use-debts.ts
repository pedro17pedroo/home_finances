import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsApi } from '../../../shared/api/debts';
import type { CreateDebtRequest, UpdateDebtRequest } from '../../../shared/types';

// Query keys
export const debtKeys = {
  all: ['debts'] as const,
  lists: () => [...debtKeys.all, 'list'] as const,
  details: () => [...debtKeys.all, 'detail'] as const,
  detail: (id: number) => [...debtKeys.details(), id] as const,
  summary: () => [...debtKeys.all, 'summary'] as const,
  overdue: () => [...debtKeys.all, 'overdue'] as const,
};

// Get all debts
export function useDebts() {
  return useQuery({
    queryKey: debtKeys.lists(),
    queryFn: debtsApi.getDebts,
  });
}

// Get debts summary
export function useDebtsSummary() {
  return useQuery({
    queryKey: debtKeys.summary(),
    queryFn: debtsApi.getDebtsSummary,
  });
}

// Get specific debt
export function useDebt(id: number) {
  return useQuery({
    queryKey: debtKeys.detail(id),
    queryFn: () => debtsApi.getDebtById(id),
    enabled: !!id,
  });
}

// Get overdue debts
export function useOverdueDebts() {
  return useQuery({
    queryKey: debtKeys.overdue(),
    queryFn: debtsApi.getOverdueDebts,
  });
}

// Create debt mutation
export function useCreateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDebtRequest) => debtsApi.createDebt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Update debt mutation
export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDebtRequest }) =>
      debtsApi.updateDebt(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: debtKeys.all });
      queryClient.invalidateQueries({ queryKey: debtKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Delete debt mutation
export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => debtsApi.deleteDebt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
