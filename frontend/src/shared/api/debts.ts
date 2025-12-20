import { apiClient } from './client';
import type { 
  ApiResponse, 
  Debt, 
  CreateDebtRequest, 
  UpdateDebtRequest,
  DebtSummary 
} from '../types';

export const debtsApi = {
  // Get all user debts
  getDebts: async (): Promise<Debt[]> => {
    const response = await apiClient.get<ApiResponse<{ debts: Debt[] }>>('/debts');
    return response.data.data?.debts || [];
  },

  // Get debt by ID
  getDebtById: async (id: number): Promise<Debt> => {
    const response = await apiClient.get<ApiResponse<{ debt: Debt }>>(`/debts/${id}`);
    if (!response.data.data?.debt) {
      throw new Error('Dívida não encontrada');
    }
    return response.data.data.debt;
  },

  // Create new debt
  createDebt: async (data: CreateDebtRequest): Promise<Debt> => {
    const response = await apiClient.post<ApiResponse<{ debt: Debt }>>('/debts', data);
    if (!response.data.data?.debt) {
      throw new Error('Erro ao criar dívida');
    }
    return response.data.data.debt;
  },

  // Update debt
  updateDebt: async (id: number, data: UpdateDebtRequest): Promise<Debt> => {
    const response = await apiClient.put<ApiResponse<{ debt: Debt }>>(`/debts/${id}`, data);
    if (!response.data.data?.debt) {
      throw new Error('Erro ao atualizar dívida');
    }
    return response.data.data.debt;
  },

  // Delete debt
  deleteDebt: async (id: number): Promise<void> => {
    await apiClient.delete(`/debts/${id}`);
  },

  // Get debts summary
  getDebtsSummary: async (): Promise<DebtSummary> => {
    const response = await apiClient.get<ApiResponse<{ summary: DebtSummary }>>('/debts/summary');
    return response.data.data?.summary || {
      totalDebts: 0,
      totalAmount: 0,
      pendingDebts: 0,
      paidDebts: 0,
      overdueDebts: 0,
      pendingAmount: 0,
      paidAmount: 0
    };
  },

  // Get overdue debts
  getOverdueDebts: async (): Promise<Debt[]> => {
    const response = await apiClient.get<ApiResponse<{ debts: Debt[] }>>('/debts/overdue');
    return response.data.data?.debts || [];
  }
};