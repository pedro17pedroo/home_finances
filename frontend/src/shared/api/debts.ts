import { apiClient } from './client';
import type { 
  ApiResponse, 
  Debt, 
  CreateDebtRequest,
  DebtSummary 
} from '../types';

export interface MakePaymentRequest {
  amount: number;
  description?: string;
}

export interface CancelRequest {
  reason: string;
}

export interface SendReminderRequest {
  customMessage?: string;
}

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

  // Make payment (partial or full)
  makePayment: async (id: number, data: MakePaymentRequest): Promise<Debt> => {
    const response = await apiClient.post<ApiResponse<{ debt: Debt }>>(`/debts/${id}/payment`, data);
    if (!response.data.data?.debt) {
      throw new Error('Erro ao registar pagamento');
    }
    return response.data.data.debt;
  },

  // Cancel debt
  cancelDebt: async (id: number, data: CancelRequest): Promise<Debt> => {
    const response = await apiClient.post<ApiResponse<{ debt: Debt }>>(`/debts/${id}/cancel`, data);
    if (!response.data.data?.debt) {
      throw new Error('Erro ao cancelar dívida');
    }
    return response.data.data.debt;
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
  },

  // Send payment reminder
  sendReminder: async (id: number, data?: SendReminderRequest): Promise<void> => {
    await apiClient.post(`/debts/${id}/send-reminder`, data || {});
  }
};