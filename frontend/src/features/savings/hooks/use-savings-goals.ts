import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsGoalsApi } from '../../../shared/api/savings-goals';
import type { CreateSavingsGoalRequest, UpdateSavingsGoalRequest, AddToGoalRequest } from '../../../shared/types';

// Query keys
export const savingsGoalKeys = {
  all: ['savings-goals'] as const,
  lists: () => [...savingsGoalKeys.all, 'list'] as const,
  list: (filters: string) => [...savingsGoalKeys.lists(), { filters }] as const,
  details: () => [...savingsGoalKeys.all, 'detail'] as const,
  detail: (id: number) => [...savingsGoalKeys.details(), id] as const,
  summary: () => [...savingsGoalKeys.all, 'summary'] as const,
  progress: (id: number) => [...savingsGoalKeys.all, 'progress', id] as const,
};

// Get all savings goals
export function useSavingsGoals() {
  return useQuery({
    queryKey: savingsGoalKeys.lists(),
    queryFn: savingsGoalsApi.getSavingsGoals,
  });
}

// Get savings goals summary
export function useSavingsGoalsSummary() {
  return useQuery({
    queryKey: savingsGoalKeys.summary(),
    queryFn: savingsGoalsApi.getSavingsGoalsSummary,
  });
}

// Get specific savings goal
export function useSavingsGoal(id: number) {
  return useQuery({
    queryKey: savingsGoalKeys.detail(id),
    queryFn: () => savingsGoalsApi.getSavingsGoalById(id),
    enabled: !!id,
  });
}

// Get goal progress
export function useGoalProgress(id: number) {
  return useQuery({
    queryKey: savingsGoalKeys.progress(id),
    queryFn: () => savingsGoalsApi.getGoalProgress(id),
    enabled: !!id,
  });
}

// Create savings goal mutation
export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSavingsGoalRequest) => savingsGoalsApi.createSavingsGoal(data),
    onSuccess: () => {
      // Invalidate and refetch savings goals
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all });
    },
  });
}

// Update savings goal mutation
export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSavingsGoalRequest }) =>
      savingsGoalsApi.updateSavingsGoal(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch savings goals
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all });
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.progress(id) });
    },
  });
}

// Add to savings goal mutation
export function useAddToSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddToGoalRequest }) =>
      savingsGoalsApi.addToSavingsGoal(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch savings goals
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all });
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.progress(id) });
    },
  });
}

// Delete savings goal mutation
export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => savingsGoalsApi.deleteSavingsGoal(id),
    onSuccess: () => {
      // Invalidate and refetch savings goals
      queryClient.invalidateQueries({ queryKey: savingsGoalKeys.all });
    },
  });
}