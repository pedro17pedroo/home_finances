import { apiClient } from './client';
import type { 
  Transfer, 
  CreateTransferRequest, 
  TransferSummary,
  ApiResponse 
} from '../types';

export const transfersApi = {
  // Get all user transfers
  getTransfers: async (filters?: {
    startDate?: string;
    endDate?: string;
    accountId?: number;
  }): Promise<Transfer[]> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.accountId) params.append('accountId', filters.accountId.toString());
    
    const url = `/transfers${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<Transfer[]>>(url);
    return response.data.data || [];
  },

  // Get transfer summary
  getTransferSummary: async (): Promise<TransferSummary> => {
    const response = await apiClient.get<ApiResponse<TransferSummary>>('/transfers/summary');
    return response.data.data!;
  },

  // Get transfers for specific account
  getAccountTransfers: async (accountId: number): Promise<Transfer[]> => {
    const response = await apiClient.get<ApiResponse<Transfer[]>>(`/transfers/account/${accountId}`);
    return response.data.data || [];
  },

  // Get specific transfer
  getTransferById: async (id: number): Promise<Transfer> => {
    const response = await apiClient.get<ApiResponse<Transfer>>(`/transfers/${id}`);
    return response.data.data!;
  },

  // Create new transfer
  createTransfer: async (data: CreateTransferRequest): Promise<Transfer> => {
    const response = await apiClient.post<ApiResponse<Transfer>>('/transfers', data);
    return response.data.data!;
  },

  // Reverse transfer (delete)
  reverseTransfer: async (id: number): Promise<void> => {
    await apiClient.delete(`/transfers/${id}`);
  },
};