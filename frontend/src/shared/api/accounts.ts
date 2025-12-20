import { apiClient } from './client';
import type { 
  Account, 
  CreateAccountRequest, 
  UpdateAccountRequest,
  AccountSummary,
  ApiResponse 
} from '../types';

export const accountsApi = {
  // Get all user accounts
  getAccounts: async (): Promise<Account[]> => {
    const response = await apiClient.get<ApiResponse<Account[]>>('/accounts');
    return response.data.data || [];
  },

  // Get savings accounts only
  getSavingsAccounts: async (): Promise<Account[]> => {
    const response = await apiClient.get<ApiResponse<Account[]>>('/accounts/savings');
    return response.data.data || [];
  },

  // Get account summary
  getAccountSummary: async (): Promise<AccountSummary> => {
    const response = await apiClient.get<ApiResponse<AccountSummary>>('/accounts/summary');
    return response.data.data!;
  },

  // Get specific account
  getAccountById: async (id: number): Promise<Account> => {
    const response = await apiClient.get<ApiResponse<Account>>(`/accounts/${id}`);
    return response.data.data!;
  },

  // Create new account
  createAccount: async (data: CreateAccountRequest): Promise<Account> => {
    const response = await apiClient.post<ApiResponse<Account>>('/accounts', data);
    return response.data.data!;
  },

  // Update account
  updateAccount: async (id: number, data: UpdateAccountRequest): Promise<Account> => {
    const response = await apiClient.put<ApiResponse<Account>>(`/accounts/${id}`, data);
    return response.data.data!;
  },

  // Delete account
  deleteAccount: async (id: number): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },
};