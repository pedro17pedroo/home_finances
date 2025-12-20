// User types
export interface User {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  planType: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  createdAt?: string;
}

// Auth types
export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  planType?: 'basic' | 'premium' | 'enterprise';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Transaction types
export interface Transaction {
  id: number;
  userId: number;
  amount: string;
  description?: string;
  category: string;
  type: 'receita' | 'despesa';
  accountId?: number;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  accountId: number;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  description?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
}

// Account types
export interface Account {
  id: number;
  userId: number;
  name: string;
  type: 'corrente' | 'poupanca';
  bank: string;
  balance: string;
  interestRate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  name: string;
  type: 'corrente' | 'poupanca';
  bank: string;
  balance: number;
  interestRate?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: 'corrente' | 'poupanca';
  bank?: string;
  interestRate?: number;
}

export interface AccountSummary {
  totalAccounts: number;
  totalBalance: number;
  savingsBalance: number;
  currentBalance: number;
  accountsByType: {
    corrente: number;
    poupanca: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Transaction Summary
export interface TransactionSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  transactionCount: number;
}

// Transfer types
export interface Transfer {
  id: number;
  userId: number;
  fromAccountId: number;
  toAccountId: number;
  amount: string;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  fromAccountName?: string;
  toAccountName?: string;
}

export interface CreateTransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
}

export interface TransferSummary {
  totalTransfers: number;
  totalAmount: number;
  thisMonth: number;
  thisMonthAmount: number;
}

// Savings Goal types
export interface SavingsGoal {
  id: number;
  userId: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  description?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  description?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string;
}

export interface AddToGoalRequest {
  amount: number;
  description?: string;
}

export interface SavingsGoalSummary {
  totalGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalProgress: number;
  completedGoals: number;
  activeGoals: number;
  overdue: number;
}

export interface GoalProgress {
  goalId: number;
  progress: number;
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
  daysRemaining: number;
  monthlyTarget: number;
  isCompleted: boolean;
  isOverdue: boolean;
}

// Loan types
export interface Loan {
  id: number;
  userId: number;
  accountId: number;
  amount: string;
  borrower: string;
  interestRate?: string;
  dueDate?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequest {
  accountId: number;
  amount: number;
  borrower: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface UpdateLoanRequest {
  amount?: number;
  borrower?: string;
  interestRate?: number;
  dueDate?: string;
  status?: 'pendente' | 'pago' | 'cancelado';
  description?: string;
}

export interface LoanSummary {
  totalLoans: number;
  totalAmount: number;
  pendingLoans: number;
  paidLoans: number;
  overdueLoans: number;
  pendingAmount: number;
  paidAmount: number;
}

// Debt types
export interface Debt {
  id: number;
  userId: number;
  accountId: number;
  amount: string;
  creditor: string;
  interestRate?: string;
  dueDate?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtRequest {
  accountId: number;
  amount: number;
  creditor: string;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export interface UpdateDebtRequest {
  amount?: number;
  creditor?: string;
  interestRate?: number;
  dueDate?: string;
  status?: 'pendente' | 'pago' | 'cancelado';
  description?: string;
}

export interface DebtSummary {
  totalDebts: number;
  totalAmount: number;
  pendingDebts: number;
  paidDebts: number;
  overdueDebts: number;
  pendingAmount: number;
  paidAmount: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: number;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'loan' | 'debt' | 'savings' | 'recurring' | 'account' | 'general';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

// Recurring Transaction types
export interface RecurringTransactionPreview {
  transactionId: number;
  description: string;
  amount: string;
  type: 'receita' | 'despesa';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
}

// Advanced Reports types
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

export interface CashFlowAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  averageMonthlyBalance: number;
  projectedBalance: number;
  burnRate: number;
  runwayMonths: number;
}

export interface DebtAnalysis {
  totalDebt: number;
  totalLoans: number;
  netDebtPosition: number;
  debtToIncomeRatio: number;
  averageInterestRate: number;
  monthlyDebtPayments: number;
}