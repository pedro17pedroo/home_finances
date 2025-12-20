import { apiClient } from './client';
import type { 
  SavingsGoal, 
  CreateSavingsGoalRequest, 
  UpdateSavingsGoalRequest,
  AddToGoalRequest,
  SavingsGoalSummary,
  GoalProgress,
  ApiResponse 
} from '../types';

export const savingsGoalsApi = {
  // Get all user savings goals
  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const response = await apiClient.get<ApiResponse<SavingsGoal[]>>('/savings-goals');
    return response.data.data || [];
  },

  // Get savings goals summary
  getSavingsGoalsSummary: async (): Promise<SavingsGoalSummary> => {
    const response = await apiClient.get<ApiResponse<SavingsGoalSummary>>('/savings-goals/summary');
    return response.data.data!;
  },

  // Get specific savings goal
  getSavingsGoalById: async (id: number): Promise<SavingsGoal> => {
    const response = await apiClient.get<ApiResponse<SavingsGoal>>(`/savings-goals/${id}`);
    return response.data.data!;
  },

  // Get goal progress
  getGoalProgress: async (id: number): Promise<GoalProgress> => {
    const response = await apiClient.get<ApiResponse<GoalProgress>>(`/savings-goals/${id}/progress`);
    return response.data.data!;
  },

  // Create new savings goal
  createSavingsGoal: async (data: CreateSavingsGoalRequest): Promise<SavingsGoal> => {
    const response = await apiClient.post<ApiResponse<SavingsGoal>>('/savings-goals', data);
    return response.data.data!;
  },

  // Update savings goal
  updateSavingsGoal: async (id: number, data: UpdateSavingsGoalRequest): Promise<SavingsGoal> => {
    const response = await apiClient.put<ApiResponse<SavingsGoal>>(`/savings-goals/${id}`, data);
    return response.data.data!;
  },

  // Add amount to savings goal
  addToSavingsGoal: async (id: number, data: AddToGoalRequest): Promise<SavingsGoal> => {
    const response = await apiClient.post<ApiResponse<SavingsGoal>>(`/savings-goals/${id}/add`, data);
    return response.data.data!;
  },

  // Delete savings goal
  deleteSavingsGoal: async (id: number): Promise<void> => {
    await apiClient.delete(`/savings-goals/${id}`);
  },
};