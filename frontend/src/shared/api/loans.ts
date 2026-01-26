import { apiClient } from './client';
import type { 
  ApiResponse, 
  Loan, 
  CreateLoanRequest,
  LoanSummary 
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

export const loansApi = {
  // Get all user loans
  getLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get<ApiResponse<{ loans: Loan[] }>>('/loans');
    return response.data.data?.loans || [];
  },

  // Get loan by ID
  getLoanById: async (id: number): Promise<Loan> => {
    const response = await apiClient.get<ApiResponse<{ loan: Loan }>>(`/loans/${id}`);
    if (!response.data.data?.loan) {
      throw new Error('Empréstimo não encontrado');
    }
    return response.data.data.loan;
  },

  // Create new loan
  createLoan: async (data: CreateLoanRequest): Promise<Loan> => {
    const response = await apiClient.post<ApiResponse<{ loan: Loan }>>('/loans', data);
    if (!response.data.data?.loan) {
      throw new Error('Erro ao criar empréstimo');
    }
    return response.data.data.loan;
  },

  // Make payment (partial or full)
  makePayment: async (id: number, data: MakePaymentRequest): Promise<Loan> => {
    const response = await apiClient.post<ApiResponse<{ loan: Loan }>>(`/loans/${id}/payment`, data);
    if (!response.data.data?.loan) {
      throw new Error('Erro ao registar pagamento');
    }
    return response.data.data.loan;
  },

  // Cancel loan
  cancelLoan: async (id: number, data: CancelRequest): Promise<Loan> => {
    const response = await apiClient.post<ApiResponse<{ loan: Loan }>>(`/loans/${id}/cancel`, data);
    if (!response.data.data?.loan) {
      throw new Error('Erro ao cancelar empréstimo');
    }
    return response.data.data.loan;
  },

  // Get loans summary
  getLoansSummary: async (): Promise<LoanSummary> => {
    const response = await apiClient.get<ApiResponse<{ summary: LoanSummary }>>('/loans/summary');
    return response.data.data?.summary || {
      totalLoans: 0,
      totalAmount: 0,
      pendingLoans: 0,
      paidLoans: 0,
      overdueLoans: 0,
      pendingAmount: 0,
      paidAmount: 0
    };
  },

  // Get overdue loans
  getOverdueLoans: async (): Promise<Loan[]> => {
    const response = await apiClient.get<ApiResponse<{ loans: Loan[] }>>('/loans/overdue');
    return response.data.data?.loans || [];
  },

  // Send payment reminder
  sendReminder: async (id: number, data?: SendReminderRequest): Promise<void> => {
    await apiClient.post(`/loans/${id}/send-reminder`, data || {});
  }
};