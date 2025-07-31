import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, TrendingUp, AlertTriangle, Crown } from 'lucide-react';
import { Link } from 'wouter';

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

interface UsageLimitsProps {
  showTitle?: boolean;
  compact?: boolean;
}

export default function UsageLimits({ showTitle = true, compact = false }: UsageLimitsProps) {
  const { data: limits, isLoading } = useQuery<UsageLimitsResponse>({
    queryKey: ['/api/user/limits'],
  });

  if (isLoading) {
    return (
      <Card className={compact ? "h-32" : ""}>
        <CardHeader className={compact ? "p-4" : ""}>
          <CardTitle className={compact ? "text-sm" : ""}>Carregando limites...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!limits) {
    return null;
  }

  const formatLimit = (limit: number | null) => {
    if (limit === null || limit === undefined) return 'Ilimitado';
    return limit === Infinity ? 'Ilimitado' : limit.toLocaleString();
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'basic': return 'Básico';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Empresarial';
      default: return planType;
    }
  };

  const shouldShowAlert = (percentage: number) => percentage && percentage >= 80;

  if (compact) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Limites de Uso</h3>
            <Badge className={getPlanColor(limits.planType)}>
              {getPlanName(limits.planType)}
            </Badge>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              <span className="text-xs font-medium">Contas</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {limits.accounts.current} / {formatLimit(limits.accounts.limit)}
            </div>
            {limits.accounts.limit !== Infinity && limits.accounts.limit !== -1 && (
              <Progress value={limits.accounts.percentage || 0} className="h-1" />
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">Transações</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {limits.transactions.current} / {formatLimit(limits.transactions.limit)}
            </div>
            {limits.transactions.limit !== Infinity && limits.transactions.limit !== -1 && (
              <Progress value={limits.transactions.percentage || 0} className="h-1" />
            )}
          </div>
        </div>

        {(shouldShowAlert(limits.accounts.percentage) || shouldShowAlert(limits.transactions.percentage)) && (
          <Alert className="p-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Você está próximo do limite. Considere fazer upgrade.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Limites de Uso
            </CardTitle>
            <CardDescription>
              Acompanhe o uso do seu plano atual
            </CardDescription>
          </div>
          <Badge className={getPlanColor(limits.planType)}>
            {getPlanName(limits.planType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contas Bancárias */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">Contas Bancárias</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.accounts.current} / {formatLimit(limits.accounts.limit)}
            </span>
          </div>
          
          {limits.accounts.limit !== Infinity && (
            <div className="space-y-2">
              <Progress value={limits.accounts.percentage || 0} />
              <div className="text-xs text-muted-foreground">
                {(limits.accounts.percentage || 0).toFixed(1)}% utilizado
              </div>
            </div>
          )}
          
          {shouldShowAlert(limits.accounts.percentage) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você está próximo do limite de contas bancárias. Considere fazer upgrade para o plano Premium.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Transações */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Transações (Este Mês)</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {limits.transactions.current} / {formatLimit(limits.transactions.limit)}
            </span>
          </div>
          
          {limits.transactions.limit !== Infinity && (
            <div className="space-y-2">
              <Progress value={limits.transactions.percentage || 0} />
              <div className="text-xs text-muted-foreground">
                {(limits.transactions.percentage || 0).toFixed(1)}% utilizado
              </div>
            </div>
          )}
          
          {shouldShowAlert(limits.transactions.percentage) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você está próximo do limite de transações mensais. Considere fazer upgrade para o plano Premium.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Upgrade Button */}
        {limits.planType === 'basic' && (
          <div className="pt-4 border-t">
            <Button asChild className="w-full">
              <Link href="/subscription">
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade para Premium
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}