import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../../../shared/api/loans';
import type { CreateLoanRequest, UpdateLoanRequest } from '../../../shared/types';

// Query keys
export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: number) => [...loanKeys.details(), id] as const,
  summary: () => [...loanKeys.all, 'summary'] as const,
  overdue: () => [...loanKeys.all, 'overdue'] as const,
};

// Get all loans
export function useLoans() {
  return useQuery({
    queryKey: loanKeys.lists(),
    queryFn: loansApi.getLoans,
  });
}

// Get loans summary
export function useLoansSummary() {
  return useQuery({
    queryKey: loanKeys.summary(),
    queryFn: loansApi.getLoansSummary,
  });
}

// Get specific loan
export function useLoan(id: number) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: () => loansApi.getLoanById(id),
    enabled: !!id,
  });
}

// Get overdue loans
export function useOverdueLoans() {
  return useQuery({
    queryKey: loanKeys.overdue(),
    queryFn: loansApi.getOverdueLoans,
  });
}

// Create loan mutation
export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLoanRequest) => loansApi.createLoan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Update loan mutation
export function useUpdateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLoanRequest }) =>
      loansApi.updateLoan(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// Delete loan mutation
export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => loansApi.deleteLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
