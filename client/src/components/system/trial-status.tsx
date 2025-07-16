import { useSystemSetting } from '@/lib/system-config';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export function TrialStatus() {
  const { user } = useAuth();
  const trialDuration = useSystemSetting('trial_duration_days', 14);
  
  if (!user || user.subscriptionStatus !== 'trial') {
    return null;
  }
  
  // Calculate days remaining in trial
  const createdAt = new Date(user.createdAt || Date.now());
  const trialEndDate = new Date(createdAt.getTime() + (trialDuration * 24 * 60 * 60 * 1000));
  const today = new Date();
  const daysRemaining = Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpiringSoon = daysRemaining <= 3;
  const hasExpired = daysRemaining <= 0;
  
  if (hasExpired) {
    return (
      <Card className="border-red-200 bg-red-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Seu período de teste expirou
              </p>
              <p className="text-xs text-red-600 mt-1">
                Escolha um plano para continuar usando todos os recursos.
              </p>
            </div>
            <Link href="/subscription">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                Escolher Plano
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isExpiringSoon) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Seu teste gratuito expira em {daysRemaining} dia{daysRemaining === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Não perca acesso aos seus dados. Escolha um plano agora.
              </p>
            </div>
            <Link href="/subscription">
              <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                Escolher Plano
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Teste gratuito: {daysRemaining} dias restantes
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Aproveite todos os recursos por mais {daysRemaining} dias.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}