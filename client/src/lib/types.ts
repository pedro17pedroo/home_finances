export interface FinancialSummary {
  currentAccountBalance: string;
  totalSavings: string;
  totalDebts: string;
  totalLoans: string;
  activeLoansCount: number;
  activeDebtsCount: number;
}

export interface MonthlyTransactionsSummary {
  income: string;
  expenses: string;
  month: string;
}

export interface ExpensesByCategory {
  category: string;
  amount: string;
  percentage: number;
}

export interface TransactionFormData {
  amount: string;
  description?: string;
  category: string;
  type: 'receita' | 'despesa';
  accountId?: number;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
}

export interface SavingsGoalFormData {
  name: string;
  targetAmount: string;
  currentAmount?: string;
  targetDate?: string;
  description?: string;
}



export const CATEGORY_COLORS = {
  alimentacao: '#3B82F6',
  moradia: '#10B981',
  transporte: '#F59E0B',
  lazer: '#EF4444',
  saude: '#8B5CF6',
  educacao: '#06B6D4',
  salario: '#10B981',
  freelance: '#F59E0B',
  investimentos: '#8B5CF6',
  outros: '#64748B',
} as const;


