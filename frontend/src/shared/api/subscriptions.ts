import { apiClient } from './client';

export type PaymentMethod = 'ekwanza' | 'gpo' | 'ref' | 'bank_transfer';
export type PaymentType = 'one_time' | 'recurring';

// Payment method configuration from backend
export interface PaymentMethodConfig {
  id: number;
  code: string;
  name: string;
  displayName: string;
  description: string;
  isInstant: boolean;
  waitTimeSeconds: number;
  maxWaitTimeSeconds: number;
  requiresPhone: boolean;
  requiresEmail: boolean;
  requiresReference: boolean;
  processingTime: string;
  icon: string;
  logoUrl?: string;
  displayOrder: number;
}

export interface Plan {
  id: number;
  name: string;
  type: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  isActive: boolean;
  trialDays?: number;
  trialOneTimeOnly?: boolean;
  maxFreeDays?: number;
  billingCycle?: string;
  durationDays?: number;
}

export interface Subscription {
  id: number;
  userId: number;
  planId: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
  paymentType: PaymentType;
  paymentMethod?: PaymentMethod;
  startDate: string;
  endDate?: string;
  trialEndsAt?: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface SubscriptionDetails extends Subscription {
  plan?: Plan;
  daysRemaining?: number;
  isTrialActive?: boolean;
}

export interface SubscriptionPayment {
  id: number;
  subscriptionId: number;
  userId: number;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  referenceCode?: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paidAt?: string;
  createdAt: string;
  paymentData?: any;
  // Enriched data from backend
  subscription?: {
    id: number;
    status: string;
    paymentType: string;
    startDate: string;
    endDate?: string;
  };
  plan?: {
    id: number;
    name: string;
    type: string;
    price: number;
  };
}

export interface SubscribeRequest {
  planId: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  payerPhone?: string;
  payerName?: string;
  payerEmail?: string;
  startTrial?: boolean;
}

export interface SubscribeResponse {
  success: boolean;
  subscription: Subscription;
  payment: SubscriptionPayment | null;
  plan: Plan;
  message: string;
  isTrial?: boolean;
}

// Get active payment methods (public)
export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const response = await apiClient.get('/subscriptions/payment-methods');
  return response.data.paymentMethods;
}

// Get all available plans (public)
export async function getPlans(): Promise<Plan[]> {
  const response = await apiClient.get('/subscriptions/plans');
  return response.data.plans;
}

// Get specific plan by ID (public)
export async function getPlanById(planId: number): Promise<Plan> {
  const response = await apiClient.get(`/subscriptions/plans/${planId}`);
  return response.data.plan;
}

// Get current user subscription
export async function getCurrentSubscription(): Promise<{
  subscription: Subscription | null;
  plan: Plan | null;
}> {
  const response = await apiClient.get('/subscriptions/current');
  return response.data;
}

// Get my subscription details (with days remaining, trial info, etc.)
export async function getMySubscription(): Promise<SubscriptionDetails | null> {
  const response = await apiClient.get('/subscriptions/my-subscription');
  return response.data.subscription;
}

// Renew subscription
export async function renewSubscription(data: {
  paymentMethod: PaymentMethod;
  payerPhone?: string;
  payerName?: string;
  payerEmail?: string;
}): Promise<SubscribeResponse> {
  const response = await apiClient.post('/subscriptions/renew', data);
  return response.data;
}

// Subscribe to a plan
export async function subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
  const response = await apiClient.post('/subscriptions/subscribe', data);
  return response.data;
}

// Check payment status
export async function checkPaymentStatus(paymentId: number): Promise<{
  payment: SubscriptionPayment;
  isPaid: boolean;
}> {
  const response = await apiClient.get(`/subscriptions/payment/${paymentId}/status`);
  return response.data;
}

// Get payment history
export async function getPaymentHistory(): Promise<SubscriptionPayment[]> {
  const response = await apiClient.get('/subscriptions/payments');
  return response.data.payments;
}

// Cancel subscription
export async function cancelSubscription(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/subscriptions/cancel');
  return response.data;
}

// ============================================
// UPGRADE / DOWNGRADE PLAN CHANGE FUNCTIONS
// ============================================

export interface PlanChangePreview {
  changeType: 'upgrade' | 'downgrade';
  fromPlan: Plan | null;
  toPlan: Plan;
  daysRemaining: number;
  creditAmount: number;
  amountToPay: number;
  effectiveDate: string;
  scheduledFor?: string;
  message: string;
}

export interface PlanChange {
  id: number;
  userId: number;
  fromPlanId: number;
  toPlanId: number;
  changeType: 'upgrade' | 'downgrade';
  status: 'pending' | 'completed' | 'cancelled' | 'scheduled';
  prorationCredit?: string;
  amountPaid?: string;
  effectiveDate?: string;
  scheduledFor?: string;
  paymentId?: number;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  fromPlan?: Plan;
  toPlan?: Plan;
}

// Preview plan change (upgrade or downgrade)
export async function previewPlanChange(planId: number): Promise<PlanChangePreview> {
  const response = await apiClient.get(`/subscriptions/plan-change/preview/${planId}`);
  return response.data;
}

// Execute upgrade with proration
export async function upgradePlan(data: {
  planId: number;
  paymentMethod: PaymentMethod;
  payerPhone?: string;
  payerName?: string;
  payerEmail?: string;
  useTrialWhilePending?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  planChange: PlanChange;
  payment?: SubscriptionPayment;
  subscription?: Subscription;
}> {
  const response = await apiClient.post('/subscriptions/upgrade', data);
  return response.data;
}

// Schedule downgrade for end of billing cycle
export async function downgradePlan(data: {
  planId: number;
}): Promise<{
  success: boolean;
  message: string;
  planChange: PlanChange;
  effectiveDate: string;
}> {
  const response = await apiClient.post('/subscriptions/downgrade', data);
  return response.data;
}

// Cancel scheduled downgrade
export async function cancelScheduledDowngrade(): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await apiClient.delete('/subscriptions/downgrade');
  return response.data;
}

// Get pending/scheduled plan changes
export async function getPendingPlanChanges(): Promise<PlanChange[]> {
  const response = await apiClient.get('/subscriptions/plan-changes/pending');
  return response.data.planChanges;
}

// Get plan change history
export async function getPlanChangeHistory(): Promise<PlanChange[]> {
  const response = await apiClient.get('/subscriptions/plan-changes/history');
  return response.data.planChanges;
}

// Payment method display names
export const paymentMethodNames: Record<PaymentMethod, string> = {
  ekwanza: 'E-Kwanza',
  gpo: 'Multicaixa Express',
  ref: 'Referência Multicaixa',
  bank_transfer: 'Transferência Bancária',
};

// Payment method descriptions
export const paymentMethodDescriptions: Record<PaymentMethod, string> = {
  ekwanza:
    'Pague usando sua conta E-Kwanza. Insira seu número de telefone para receber o código de pagamento.',
  gpo: 'Pagamento instantâneo via Multicaixa Express. Você receberá uma notificação no seu telefone.',
  ref: 'Gere uma referência para pagar em qualquer caixa Multicaixa ou ATM. Válido por 60 minutos.',
  bank_transfer: 'Faça uma transferência bancária para a conta indicada.',
};
