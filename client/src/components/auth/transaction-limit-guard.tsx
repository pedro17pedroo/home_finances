import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Zap } from 'lucide-react';

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

interface Transaction {
  id: number;
  amount: string;
  type: 'receita' | 'despesa';
  createdAt: string;
}

const PLAN_LIMITS = {
  basic: 1000,
  premium: Infinity,
  enterprise: Infinity
};

export default function TransactionLimitGuard({ children, fallback }: TransactionLimitGuardProps) {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  if (!user) {
    return <>{children}</>;
  }

  const userPlan = user.planType as keyof typeof PLAN_LIMITS;
  const monthlyLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.basic;

  // If user has unlimited plan, show children
  if (monthlyLimit === Infinity) {
    return <>{children}</>;
  }

  // Count transactions for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions?.filter(t => {
    const transactionDate = new Date(t.createdAt);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  }) || [];

  const transactionCount = monthlyTransactions.length;
  const percentage = (transactionCount / monthlyLimit) * 100;

  // If limit reached, show upgrade prompt
  if (transactionCount >= monthlyLimit) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="text-center border-amber-200">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl text-amber-900">
              Limite Mensal Atingido
            </CardTitle>
            <CardDescription className="text-base">
              Você atingiu o limite de <strong>{monthlyLimit} transações</strong> do plano Básico para este mês.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={100} className="w-full" />
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-900">
                Upgrade para Premium
              </h4>
              <ul className="text-sm text-left space-y-1 text-blue-800">
                <li>✓ Transações ilimitadas</li>
                <li>✓ Relatórios avançados</li>
                <li>✓ Gestão de empréstimos</li>
                <li>✓ Controle de dívidas</li>
              </ul>
            </div>
            
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
              <Zap className="h-4 w-4 mr-2" />
              Fazer Upgrade Agora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If approaching limit, show warning
  if (percentage >= 80) {
    return (
      <div className="space-y-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Atenção: Limite quase atingido
                </p>
                <p className="text-xs text-amber-700">
                  {transactionCount} de {monthlyLimit} transações utilizadas este mês ({percentage.toFixed(0)}%)
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700">
                Upgrade
              </Button>
            </div>
            <Progress value={percentage} className="mt-2" />
          </CardContent>
        </Card>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}