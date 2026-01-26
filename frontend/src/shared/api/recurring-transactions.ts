import { apiClient } from './client';

export interface RecurringTransaction {
  id: number;
  type: 'receita' | 'despesa';
  description: string;
  amount: string;
  categoryId: number | null;
  categoryName: string;
  accountId: number;
  accountName: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  nextExecutionDate: string;
  lastExecutionDate: string | null;
  isActive: boolean;
  maxOccurrences: number | null;
  executionCount: number;
  notifyBeforeDays: number;
  notificationChannels: ('app' | 'email' | 'sms')[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringTransactionData {
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  categoryId: number;
  accountId: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  notifyBeforeDays?: number;
  notificationChannels?: ('app' | 'email' | 'sms')[];
}

export interface UpdateRecurringTransactionData extends Partial<CreateRecurringTransactionData> {}

export const recurringTransactionsApi = {
  getAll: async (): Promise<RecurringTransaction[]> => {
    const response = await apiClient.get('/recurring-transactions');
    return response.data.data.recurringTransactions;
  },

  getById: async (id: number): Promise<RecurringTransaction> => {
    const response = await apiClient.get(`/recurring-transactions/${id}`);
    return response.data.data.recurringTransaction;
  },

  create: async (data: CreateRecurringTransactionData): Promise<RecurringTransaction> => {
    const response = await apiClient.post('/recurring-transactions', data);
    return response.data.data.recurringTransaction;
  },

  update: async (id: number, data: UpdateRecurringTransactionData): Promise<RecurringTransaction> => {
    const response = await apiClient.put(`/recurring-transactions/${id}`, data);
    return response.data.data.recurringTransaction;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/recurring-transactions/${id}`);
  },

  activate: async (id: number): Promise<void> => {
    await apiClient.post(`/recurring-transactions/${id}/activate`);
  },

  deactivate: async (id: number): Promise<void> => {
    await apiClient.post(`/recurring-transactions/${id}/deactivate`);
  },

  executeNow: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/recurring-transactions/${id}/execute`);
    return response.data.data.transaction;
  },

  getUpcoming: async (days: number = 30): Promise<any[]> => {
    const response = await apiClient.get(`/recurring-transactions/upcoming?days=${days}`);
    return response.data.data.upcoming;
  },

  getExecutionHistory: async (id: number): Promise<any[]> => {
    const response = await apiClient.get(`/recurring-transactions/${id}/history`);
    return response.data.data.history;
  },
};
