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
  // Expense categories
  alimentacao: '#3B82F6',
  moradia: '#10B981',
  transporte: '#F59E0B',
  lazer: '#EF4444',
  saude: '#8B5CF6',
  educacao: '#06B6D4',
  outros: '#64748B',
  // Income categories
  salario: '#10B981',
  freelance: '#F59E0B',
  investimentos: '#8B5CF6',
  // Custom categories (case insensitive)
  'Aluguel': '#F59E0B',
  'Empréstimos': '#8B5CF6',
  'Emprestimos': '#8B5CF6',
  'aluguel': '#F59E0B',
  'emprestimos': '#8B5CF6',
  'empréstimos': '#8B5CF6',
} as const;


