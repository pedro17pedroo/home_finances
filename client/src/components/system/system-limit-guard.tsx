import { useSystemSetting } from '@/lib/system-config';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SystemLimitGuardProps {
  children: React.ReactNode;
  feature: 'accounts' | 'transactions';
  currentCount: number;
  planType: string;
}

export function SystemLimitGuard({ children, feature, currentCount, planType }: SystemLimitGuardProps) {
  const limitKey = `max_${feature}_${planType}`;
  const limit = useSystemSetting(limitKey, -1);
  
  // -1 means unlimited
  if (limit === -1) {
    return <>{children}</>;
  }
  
  const isAtLimit = currentCount >= limit;
  const isNearLimit = currentCount >= (limit * 0.8); // 80% of limit
  
  if (isAtLimit) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Limite Atingido
          </h3>
          <p className="text-red-600 mb-4">
            Você atingiu o limite de {limit} {feature === 'accounts' ? 'contas' : 'transações'} 
            para o seu plano {planType}.
          </p>
          <p className="text-sm text-red-500">
            Faça upgrade do seu plano para continuar adicionando {feature === 'accounts' ? 'contas' : 'transações'}.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      {isNearLimit && (
        <Card className="border-yellow-200 bg-yellow-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Aviso:</strong> Você está próximo do limite ({currentCount}/{limit} {feature === 'accounts' ? 'contas' : 'transações'}).
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Considere fazer upgrade do seu plano para evitar interrupções.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {children}
    </>
  );
}

// Hook for getting current plan limits
export function useCurrentPlanLimits(planType: string) {
  const maxAccounts = useSystemSetting(`max_accounts_${planType}`, -1);
  const maxTransactions = useSystemSetting(`max_transactions_${planType}`, -1);
  
  return {
    maxAccounts,
    maxTransactions,
    isUnlimited: (feature: 'accounts' | 'transactions') => {
      const limit = feature === 'accounts' ? maxAccounts : maxTransactions;
      return limit === -1;
    }
  };
}