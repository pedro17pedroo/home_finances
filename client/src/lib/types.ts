export interface FinancialSummary {
  currentAccountBalance: string;
  totalSavings: string;
  totalDebts: string;
  totalLoans: string;
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

export const CATEGORIES = {
  receita: [
    { value: 'salario', label: 'Salário' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'investimentos', label: 'Investimentos' },
    { value: 'outros', label: 'Outros' },
  ],
  despesa: [
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'moradia', label: 'Moradia' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'lazer', label: 'Lazer' },
    { value: 'saude', label: 'Saúde' },
    { value: 'educacao', label: 'Educação' },
    { value: 'outros', label: 'Outros' },
  ],
} as const;

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

export const CATEGORY_LABELS = {
  alimentacao: 'Alimentação',
  moradia: 'Moradia',
  transporte: 'Transporte',
  lazer: 'Lazer',
  saude: 'Saúde',
  educacao: 'Educação',
  salario: 'Salário',
  freelance: 'Freelance',
  investimentos: 'Investimentos',
  outros: 'Outros',
} as const;
