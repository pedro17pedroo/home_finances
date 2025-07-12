import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Crown } from 'lucide-react';
import { Link } from 'wouter';

interface PlanGuardProps {
  requiredPlan: 'basic' | 'premium' | 'enterprise';
  fallback?: React.ReactNode;
  children: React.ReactNode;
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

const PLAN_HIERARCHY = {
  basic: 1,
  premium: 2,
  enterprise: 3
};

const PLAN_NAMES = {
  basic: 'Básico',
  premium: 'Premium', 
  enterprise: 'Empresarial'
};

const PLAN_FEATURES = {
  basic: [
    'Até 5 contas bancárias',
    '1.000 transações/mês',
    'Relatórios básicos',
    'Metas de poupança'
  ],
  premium: [
    'Contas bancárias ilimitadas',
    'Transações ilimitadas',
    'Relatórios avançados',
    'Controle de empréstimos',
    'Gestão de dívidas'
  ],
  enterprise: [
    'Tudo do Premium',
    'Múltiplos usuários',
    'API personalizada',
    'Integração com bancos'
  ]
};

export default function PlanGuard({ requiredPlan, fallback, children }: PlanGuardProps) {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to ensure latest plan data
  });

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Acesso Restrito
          </CardTitle>
          <CardDescription>
            Você precisa estar logado para acessar esta funcionalidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Fazer Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const userPlanLevel = PLAN_HIERARCHY[user.planType as keyof typeof PLAN_HIERARCHY] || 0;
  const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];

  // Check if user has required plan or higher
  if (userPlanLevel >= requiredPlanLevel) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'premium':
        return <Zap className="h-6 w-6 text-blue-600" />;
      case 'enterprise':
        return <Crown className="h-6 w-6 text-purple-600" />;
      default:
        return <Lock className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {getPlanIcon(requiredPlan)}
          </div>
          <CardTitle className="text-2xl">
            Upgrade Necessário
          </CardTitle>
          <CardDescription className="text-lg">
            Esta funcionalidade requer o plano <strong>{PLAN_NAMES[requiredPlan]}</strong> ou superior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Seu plano atual: {PLAN_NAMES[user.planType as keyof typeof PLAN_NAMES] || 'Desconhecido'}</h4>
            <h4 className="font-semibold mb-2">Funcionalidades do plano {PLAN_NAMES[requiredPlan]}:</h4>
            <ul className="text-sm text-left space-y-1">
              {PLAN_FEATURES[requiredPlan].map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button size="lg" className="w-full">
              Fazer Upgrade para {PLAN_NAMES[requiredPlan]}
            </Button>
            <p className="text-xs text-gray-500">
              Upgrade instantâneo • Cancele a qualquer momento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}