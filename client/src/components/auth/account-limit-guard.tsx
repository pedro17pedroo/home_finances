import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Lock, Crown } from 'lucide-react';
import { Link } from 'wouter';

interface AccountLimitGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface User {
  id: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  planType: string;
}

interface UsageLimitsResponse {
  accounts: {
    current: number;
    limit: number;
    percentage: number;
    canCreate: boolean;
  };
  transactions: {
    current: number;
    limit: number;
    percentage: number;
    canCreate: boolean;
  };
  planType: string;
  isUnlimited: boolean;
}

export default function AccountLimitGuard({ children, fallback }: AccountLimitGuardProps) {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const { data: limits } = useQuery<UsageLimitsResponse>({
    queryKey: ['/api/user/limits'],
  });

  if (!user || !limits) {
    return <>{children}</>;
  }

  // Se o usuário pode criar contas, mostrar o children
  if (limits.accounts.canCreate) {
    return <>{children}</>;
  }

  // Se foi fornecido um fallback personalizado, usar ele
  if (fallback) {
    return <>{fallback}</>;
  }

  // Mostrar upgrade prompt padrão
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Limite de Contas Atingido
        </CardTitle>
        <CardDescription>
          Você atingiu o limite de {limits.accounts.limit} contas bancárias do plano {limits.planType === 'basic' ? 'Básico' : limits.planType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Você está usando {limits.accounts.current} de {limits.accounts.limit} contas bancárias disponíveis.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para criar mais contas bancárias e ter acesso a recursos avançados, 
            faça upgrade para o plano Premium:
          </p>
          
          <ul className="text-sm space-y-1 ml-4">
            <li>• Contas bancárias ilimitadas</li>
            <li>• Transações ilimitadas</li>
            <li>• Relatórios avançados</li>
            <li>• Controle de empréstimos e dívidas</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href="/subscription">
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/poupanca">
              Gerenciar Contas
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}