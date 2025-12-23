import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMySubscription, 
  renewSubscription, 
  cancelSubscription,
  SubscriptionDetails,
  PaymentMethod 
} from '../api/subscriptions';
import { apiClient } from '../api/client';

// Plan feature keys (should match backend PLAN_FEATURES)
export const PLAN_FEATURES = {
  // Reports
  REPORTS_BASIC: 'reports_basic',
  REPORTS_ADVANCED: 'reports_advanced',
  REPORTS_EXPORT: 'reports_export',
  
  // Transactions
  TRANSACTIONS_RECURRING: 'transactions_recurring',
  TRANSACTIONS_BULK_IMPORT: 'transactions_bulk_import',
  
  // Categories
  CATEGORIES_CUSTOM: 'categories_custom',
  CATEGORIES_UNLIMITED: 'categories_unlimited',
  
  // Goals
  GOALS_BASIC: 'goals_basic',
  GOALS_UNLIMITED: 'goals_unlimited',
  
  // Loans & Debts
  LOANS_MANAGEMENT: 'loans_management',
  
  // Team
  TEAM_MEMBERS: 'team_members',
  TEAM_UNLIMITED: 'team_unlimited',
  
  // WhatsApp
  WHATSAPP_INTEGRATION: 'whatsapp_integration',
  WHATSAPP_AI: 'whatsapp_ai',
  
  // Support
  SUPPORT_PRIORITY: 'support_priority',
  SUPPORT_DEDICATED: 'support_dedicated',
  
  // API
  API_ACCESS: 'api_access',
  
  // Notifications
  NOTIFICATIONS_EMAIL: 'notifications_email',
  NOTIFICATIONS_SMS: 'notifications_sms',
  NOTIFICATIONS_PUSH: 'notifications_push',
} as const;

export interface PlanLimits {
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  features: string[];
}

export interface AccessInfo {
  limits: PlanLimits;
  subscription: {
    status: string;
    planName: string;
    planType: string;
    daysRemaining: number | null;
    isTrialActive: boolean;
  } | null;
}

export function useMySubscription() {
  return useQuery({
    queryKey: ['my-subscription'],
    queryFn: getMySubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRenewSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      paymentMethod: PaymentMethod;
      payerPhone?: string;
      payerName?: string;
      payerEmail?: string;
    }) => renewSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
  });
}

// Helper function to get subscription status info
export function getSubscriptionStatusInfo(subscription: SubscriptionDetails | null | undefined) {
  if (!subscription) {
    return {
      status: 'none',
      statusLabel: 'Sem Assinatura',
      statusColor: 'gray',
      message: 'Você ainda não possui uma assinatura ativa.',
      showRenewButton: false,
      showUpgradeButton: true,
      isExpiring: false,
      daysRemaining: 0,
    };
  }

  const { status, daysRemaining = 0, isTrialActive, plan } = subscription;

  switch (status) {
    case 'trial':
      return {
        status: 'trial',
        statusLabel: 'Período de Teste',
        statusColor: 'blue',
        message: isTrialActive 
          ? `Você tem ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''} no período de teste.`
          : 'Seu período de teste expirou.',
        showRenewButton: !isTrialActive || daysRemaining <= 3,
        showUpgradeButton: false,
        isExpiring: daysRemaining <= 3,
        daysRemaining,
      };
    
    case 'active':
      return {
        status: 'active',
        statusLabel: 'Ativo',
        statusColor: 'green',
        message: daysRemaining > 0 
          ? `Sua assinatura ${plan?.name || ''} está ativa. ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}.`
          : `Sua assinatura ${plan?.name || ''} está ativa.`,
        showRenewButton: daysRemaining > 0 && daysRemaining <= 7,
        showUpgradeButton: plan?.type !== 'enterprise',
        isExpiring: daysRemaining > 0 && daysRemaining <= 7,
        daysRemaining,
      };
    
    case 'expired':
      return {
        status: 'expired',
        statusLabel: 'Expirado',
        statusColor: 'red',
        message: 'Sua assinatura expirou. Renove para continuar usando todos os recursos.',
        showRenewButton: true,
        showUpgradeButton: false,
        isExpiring: false,
        daysRemaining: 0,
      };
    
    case 'cancelled':
      return {
        status: 'cancelled',
        statusLabel: 'Cancelado',
        statusColor: 'gray',
        message: 'Sua assinatura foi cancelada.',
        showRenewButton: true,
        showUpgradeButton: false,
        isExpiring: false,
        daysRemaining: 0,
      };
    
    case 'pending':
      return {
        status: 'pending',
        statusLabel: 'Pendente',
        statusColor: 'yellow',
        message: 'Aguardando confirmação do pagamento.',
        showRenewButton: false,
        showUpgradeButton: false,
        isExpiring: false,
        daysRemaining: 0,
      };
    
    default:
      return {
        status: 'unknown',
        statusLabel: 'Desconhecido',
        statusColor: 'gray',
        message: 'Status da assinatura desconhecido.',
        showRenewButton: false,
        showUpgradeButton: true,
        isExpiring: false,
        daysRemaining: 0,
      };
  }
}


// Hook to get user's plan access info (limits and features)
export function usePlanAccess() {
  return useQuery<AccessInfo>({
    queryKey: ['plan-access'],
    queryFn: async () => {
      const response = await apiClient.get('/subscriptions/access-info');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to check if user has access to a specific feature
export function useHasFeature(featureKey: string) {
  const { data: accessInfo, isLoading } = usePlanAccess();
  
  if (isLoading || !accessInfo) {
    return { hasAccess: false, isLoading: true };
  }
  
  const hasAccess = accessInfo.limits.features.some(f => 
    f.toLowerCase().includes(featureKey.toLowerCase()) ||
    featureKey.toLowerCase().includes(f.toLowerCase())
  );
  
  return { hasAccess, isLoading: false };
}

// Hook to check account limit
export function useAccountLimit() {
  const { data: accessInfo, isLoading } = usePlanAccess();
  
  return {
    maxAccounts: accessInfo?.limits.maxAccounts ?? 2,
    isUnlimited: accessInfo?.limits.maxAccounts === -1,
    isLoading,
  };
}

// Hook to check transaction limit
export function useTransactionLimit() {
  const { data: accessInfo, isLoading } = usePlanAccess();
  
  return {
    maxTransactions: accessInfo?.limits.maxTransactions ?? 50,
    isUnlimited: accessInfo?.limits.maxTransactions === -1,
    isLoading,
  };
}

// Component wrapper for feature-gated content
export function useFeatureGate(featureKey: string) {
  const { hasAccess, isLoading } = useHasFeature(featureKey);
  
  return {
    isAllowed: hasAccess,
    isLoading,
    showUpgradePrompt: !hasAccess && !isLoading,
  };
}
