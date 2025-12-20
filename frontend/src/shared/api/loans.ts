import { apiClient } from './client';
import type { 
  ApiResponse, 
  Loan, 
  CreateLoanRequest, 
  UpdateLoanRequest,
  LoanSummary 
} from '../types';

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

  // Update loan
  updateLoan: async (id: number, data: UpdateLoanRequest): Promise<Loan> => {
    const response = await apiClient.put<ApiResponse<{ loan: Loan }>>(`/loans/${id}`, data);
    if (!response.data.data?.loan) {
      throw new Error('Erro ao atualizar empréstimo');
    }
    return response.data.data.loan;
  },

  // Delete loan
  deleteLoan: async (id: number): Promise<void> => {
    await apiClient.delete(`/loans/${id}`);
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
  }
};