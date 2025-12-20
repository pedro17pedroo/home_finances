import { apiClient } from './client';
import type { 
  Transaction, 
  CreateTransactionRequest, 
  TransactionSummary,
  ApiResponse 
} from '../types';

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'receita' | 'despesa';
  accountId?: number;
}

export const transactionsApi = {
  getAll: (filters?: TransactionFilters) => 
    apiClient.get<ApiResponse<{ transactions: Transaction[] }>>('/transactions', { 
      params: filters 
    }),

  getById: (id: number) => 
    apiClient.get<ApiResponse<{ transaction: Transaction }>>(`/transactions/${id}`),

  create: (data: CreateTransactionRequest) => 
    apiClient.post<ApiResponse<{ transaction: Transaction }>>('/transactions', data),

  update: (id: number, data: Partial<CreateTransactionRequest>) => 
    apiClient.put<ApiResponse<{ transaction: Transaction }>>(`/transactions/${id}`, data),

  delete: (id: number) => 
    apiClient.delete(`/transactions/${id}`),

  getSummary: (startDate?: string, endDate?: string) => 
    apiClient.get<ApiResponse<{ summary: TransactionSummary }>>('/transactions/summary', {
      params: { startDate, endDate }
    }),
};