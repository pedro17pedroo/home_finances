// User Types
export interface User {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  planType: string;
  subscriptionStatus: string;
  role?: string;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Account Types
export interface Account {
  id: number;
  name: string;
  type: 'corrente' | 'poupanca' | 'investimento' | 'carteira' | 'outro';
  bank?: string; // Legacy field - nome do banco como string
  bankId?: number; // ID do banco na tabela banks
  bankName?: string; // Nome do banco do join
  bankCode?: string; // Código do banco do join
  bankLogoUrl?: string; // URL do logo do banco do join
  balance: string;
  currency?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Transaction Types
export interface Transaction {
  id: number;
  type: 'receita' | 'despesa';
  amount: string;
  description?: string;
  date: string;
  categoryId?: number;
  category?: Category;
  accountId: number;
  account?: Account;
  userId: number;
  organizationId?: number;
  isRecurring?: boolean;
  recurringId?: number;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon?: string;
  color?: string;
  parentId?: number;
  userId?: number;
  organizationId?: number;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Transfer Types
export interface Transfer {
  id: number;
  amount: string;
  description?: string;
  date: string;
  fromAccountId: number;
  fromAccount?: Account;
  toAccountId: number;
  toAccount?: Account;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Savings Goal Types
export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline?: string;
  targetDate?: string;
  icon?: string;
  color?: string;
  description?: string;
  accountId?: number;
  account?: Account;
  accountName?: string;
  accountBalance?: string;
  accountBank?: string;
  userId: number;
  organizationId?: number;
  isCompleted?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Loan Types
export interface Loan {
  id: number;
  accountId: number;
  amount: string;
  paidAmount?: string;
  remainingAmount?: string;
  borrower: string;
  personName?: string; // alias for borrower
  borrowerPhone?: string;
  borrowerEmail?: string;
  notificationChannels?: ('app' | 'email' | 'sms')[];
  interestRate?: string;
  startDate?: string;
  dueDate?: string;
  status: 'active' | 'paid' | 'overdue' | 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  description?: string;
  notes?: string;
  cancelReason?: string;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Debt Types
export interface Debt {
  id: number;
  accountId: number;
  amount: string;
  totalAmount?: string; // alias for amount
  paidAmount?: string;
  remainingAmount?: string;
  interestRate?: string;
  creditor: string;
  creditorPhone?: string;
  creditorEmail?: string;
  notificationChannels?: ('app' | 'email' | 'sms')[];
  startDate?: string;
  dueDate?: string;
  minimumPayment?: string;
  status: 'active' | 'paid' | 'overdue' | 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  description?: string;
  notes?: string;
  cancelReason?: string;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Recurring Transaction Types
export interface RecurringTransaction {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  amount: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDate: string;
  categoryId?: number;
  category?: Category;
  accountId: number;
  account?: Account;
  isActive: boolean;
  userId: number;
  organizationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Subscription Types
export interface Plan {
  id: number;
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: string;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  isActive: boolean;
}

export interface Subscription {
  id: number;
  userId: number;
  planId: number;
  plan?: Plan;
  status: 'active' | 'trialing' | 'canceled' | 'expired';
  startDate: string;
  endDate?: string;
  trialEndsAt?: string;
  paymentType: 'one_time' | 'recurring';
}

// Organization Types
export interface Organization {
  id: number;
  name: string;
  ownerId: number;
  planType: string;
  maxUsers: number;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationMember {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt?: string;
}

// Organization membership for multi-org support
export interface OrganizationMembership {
  organizationId: number;
  organizationName: string;
  role: 'owner' | 'admin' | 'member';
}

// Active organization with full details
export interface ActiveOrganization {
  id: number;
  name: string;
  role: string;
  planType: string | null;
  subscriptionStatus: string | null;
}

// Organization with user's membership info
export interface OrganizationWithMembership {
  id: number;
  name: string;
  role: 'owner' | 'admin' | 'member';
  subscription: {
    planType: string;
    status: string;
  };
  memberCount: number;
  isActive: boolean;
}

export interface TeamInvitation {
  id: number;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt?: string;
}

// Notification Types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  userId: number;
  createdAt: string;
}

// Dashboard Types
export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  accountsCount: number;
  transactionsCount: number;
  pendingTransactions: number;
  recentTransactions?: Transaction[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
  Dashboard: undefined;
  Accounts: undefined;
  AddAccount: { account?: Account };
  Transactions: undefined;
  AddTransaction: { type?: 'receita' | 'despesa' };
  Transfers: undefined;
  AddTransfer: undefined;
  SavingsGoals: undefined;
  AddSavingsGoal: { goal?: SavingsGoal };
  Loans: undefined;
  AddLoan: { loan?: Loan };
  Debts: undefined;
  AddDebt: { debt?: Debt };
  Categories: undefined;
  AddCategory: { category?: Category };
  RecurringTransactions: undefined;
  AddRecurringTransaction: { recurring?: RecurringTransaction };
  Reports: undefined;
  Export: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Subscription: undefined;
  Team: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
};
