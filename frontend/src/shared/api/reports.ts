import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AccountData {
  accountName: string;
  accountType: string;
  balance: number;
  percentage: number;
}

export interface FinancialOverview {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  savingsRate: number;
  monthlyTrend: MonthlyData[];
  categoryBreakdown: CategoryData[];
  accountDistribution: AccountData[];
}

export const reportsApi = {
  getFinancialOverview: async (months: number = 6): Promise<FinancialOverview> => {
    const response = await apiClient.get<ApiResponse<FinancialOverview>>(
      `/advanced-reports/financial-overview?months=${months}`
    );
    // A API retorna { status: "success", data: FinancialOverview }
    return response.data.data!;
  },
};
