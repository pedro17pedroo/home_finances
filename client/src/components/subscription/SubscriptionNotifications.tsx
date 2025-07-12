import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionData {
  subscriptionStatus: string;
  planType: string;
  trialEndsAt: string | null;
  subscriptionDetails: any;
}

export default function SubscriptionNotifications() {
  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!subscription) return null;

  const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const isTrialEnding = trialEndsAt && trialEndsAt < threeDaysFromNow;

  // Trial ending notification
  if (subscription.subscriptionStatus === "trialing" && isTrialEnding) {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Seu período de teste está terminando!</strong>
            <p className="text-sm mt-1">
              Termina em {trialEndsAt && format(trialEndsAt, "dd/MM/yyyy", { locale: ptBR })}. 
              Configure um método de pagamento para continuar usando todas as funcionalidades.
            </p>
          </div>
          <Link href="/subscription">
            <Button size="sm" variant="outline" className="ml-4">
              Gerenciar Assinatura
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Payment overdue notification
  if (subscription.subscriptionStatus === "past_due") {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <CreditCard className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Pagamento em atraso!</strong>
            <p className="text-sm mt-1">
              Seu pagamento não foi processado. Atualize sua forma de pagamento para continuar usando o serviço.
            </p>
          </div>
          <Link href="/subscription">
            <Button size="sm" variant="destructive" className="ml-4">
              Atualizar Pagamento
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial active notification (first 3 days)
  if (subscription.subscriptionStatus === "trialing" && trialEndsAt && now < new Date(trialEndsAt.getTime() - 11 * 24 * 60 * 60 * 1000)) {
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Bem-vindo ao seu período de teste!</strong>
            <p className="text-sm mt-1">
              Você tem 14 dias para explorar todas as funcionalidades. 
              Período de teste termina em {trialEndsAt && format(trialEndsAt, "dd/MM/yyyy", { locale: ptBR })}.
            </p>
          </div>
          <Link href="/subscription">
            <Button size="sm" variant="outline" className="ml-4">
              Ver Planos
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}