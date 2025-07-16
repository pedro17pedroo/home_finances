import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Crown, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

interface TransactionLimitGuardProps {
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

export default function TransactionLimitGuard({ children, fallback }: TransactionLimitGuardProps) {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    throwOnError: false,
  });

  const { data: limits } = useQuery<UsageLimitsResponse>({
    queryKey: ['/api/user/limits'],
    throwOnError: false,
  });

  if (!user || !limits) {
    return <>{children}</>;
  }

  // Se o usuário pode criar transações, mostrar o children
  if (limits.transactions.canCreate) {
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
          <AlertTriangle className="h-5 w-5" />
          Limite de Transações Atingido
        </CardTitle>
        <CardDescription>
          Você atingiu o limite de {limits.transactions.limit} transações mensais do plano {limits.planType === 'basic' ? 'Básico' : limits.planType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            Você está usando {limits.transactions.current} de {limits.transactions.limit} transações disponíveis este mês.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para continuar criando transações e ter acesso a recursos avançados, 
            faça upgrade para o plano Premium:
          </p>
          
          <ul className="text-sm space-y-1 ml-4">
            <li>• Transações ilimitadas</li>
            <li>• Contas bancárias ilimitadas</li>
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
            <Link href="/receitas">
              Ver Transações
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}