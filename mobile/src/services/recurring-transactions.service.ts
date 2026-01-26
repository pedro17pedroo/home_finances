import api from './api';

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

class RecurringTransactionsService {
  async getAll(): Promise<RecurringTransaction[]> {
    const response = await api.get('/recurring-transactions');
    return response.data.data.recurringTransactions;
  }

  async getById(id: number): Promise<RecurringTransaction> {
    const response = await api.get(`/recurring-transactions/${id}`);
    return response.data.data.recurringTransaction;
  }

  async create(data: CreateRecurringTransactionData): Promise<RecurringTransaction> {
    const response = await api.post('/recurring-transactions', data);
    return response.data.data.recurringTransaction;
  }

  async update(id: number, data: Partial<CreateRecurringTransactionData>): Promise<RecurringTransaction> {
    const response = await api.put(`/recurring-transactions/${id}`, data);
    return response.data.data.recurringTransaction;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`/recurring-transactions/${id}`);
  }

  async activate(id: number): Promise<void> {
    await api.post(`/recurring-transactions/${id}/activate`);
  }

  async deactivate(id: number): Promise<void> {
    await api.post(`/recurring-transactions/${id}/deactivate`);
  }

  async executeNow(id: number): Promise<any> {
    const response = await api.post(`/recurring-transactions/${id}/execute`);
    return response.data.data.transaction;
  }

  async getUpcoming(days: number = 30): Promise<any[]> {
    const response = await api.get(`/recurring-transactions/upcoming?days=${days}`);
    return response.data.data.upcoming;
  }

  async getExecutionHistory(id: number): Promise<any[]> {
    const response = await api.get(`/recurring-transactions/${id}/history`);
    return response.data.data.history;
  }
}

export default new RecurringTransactionsService();
