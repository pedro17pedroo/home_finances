export interface User {
  id: number;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  planType: 'basic' | 'premium' | 'enterprise';
  subscriptionStatus: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'corrente' | 'poupanca';
  bank: string;
  balance: string;
  userId: number;
}

export interface Transaction {
  id: number;
  amount: string;
  type: 'receita' | 'despesa';
  category: string;
  description?: string;
  date: string;
  accountId: number;
  userId: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  accountId?: number;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string;
  description?: string;
  isActive: boolean;
  userId: number;
  // Account info (from join)
  accountName?: string;
  accountBalance?: string;
  accountBank?: string;
}

export interface Loan {
  id: number;
  amount: string;
  borrower: string;
  interestRate?: string;
  dueDate?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  description?: string;
  userId: number;
}

export interface Debt {
  id: number;
  amount: string;
  creditor: string;
  interestRate?: string;
  dueDate?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  description?: string;
  userId: number;
}