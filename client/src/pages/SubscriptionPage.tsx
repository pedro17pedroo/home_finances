import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Zap,
  Shield,
  Star,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamManagement from "@/components/team/team-management";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionData {
  subscriptionStatus: string;
  planType: string;
  trialEndsAt: string | null;
  subscriptionDetails: any;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/status"],
  });

  const { data: plans } = useQuery({
    queryKey: ["/api/plans"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/cancel"),
    onSuccess: () => {
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: (planType: string) => 
      apiRequest("POST", "/api/subscription/change-plan", { planType }),
    onSuccess: () => {
      toast({
        title: "Plano alterado",
        description: "Seu plano foi alterado com sucesso.",
      });
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      
      // Force a page reload to refresh all components with new plan data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/billing-portal"),
    onSuccess: (data: any) => {
      window.open(data.url, "_blank");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao abrir portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativa</Badge>;
      case "trialing":
        return <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" />Período de Teste</Badge>;
      case "canceled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      case "past_due":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Pagamento Atrasado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case "basic":
        return <Shield className="w-4 h-4" />;
      case "premium":
        return <Star className="w-4 h-4" />;
      case "enterprise":
        return <Zap className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const isTrialEnding = subscription?.trialEndsAt && 
    new Date(subscription.trialEndsAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  
  const isEnterprisePlan = user?.planType === 'enterprise';

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Assinatura</h1>
        <p className="text-gray-600 mt-2">
          Gerencie seu plano, pagamentos e configurações da assinatura
        </p>
      </div>

      {/* Alerta de teste terminando */}
      {isTrialEnding && subscription?.subscriptionStatus === "trialing" && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Seu período de teste está terminando!</strong> Termina em{" "}
            {subscription.trialEndsAt && format(new Date(subscription.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })}.
            Configure um método de pagamento para continuar usando o serviço.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs para diferentes seções */}
      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className={`grid w-full ${isEnterprisePlan ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Planos
          </TabsTrigger>
          {isEnterprisePlan && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipe
            </TabsTrigger>
          )}
        </TabsList>

        {/* Aba de Assinatura */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Status da Assinatura */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Status da Assinatura
            </CardTitle>
            <CardDescription>
              Informações sobre sua assinatura atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                {subscription && getStatusBadge(subscription.subscriptionStatus)}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Plano Atual</p>
                <div className="flex items-center gap-2">
                  {subscription && getPlanIcon(subscription.planType)}
                  <span className="font-medium capitalize">{subscription?.planType}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Período de Teste</p>
                {subscription?.trialEndsAt ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Termina em {format(new Date(subscription.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Não aplicável</span>
                )}
              </div>
            </div>

            {subscription?.subscriptionDetails && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Detalhes da Cobrança</h4>
                <div className="text-sm text-gray-600">
                  <p>Próxima cobrança: {format(new Date(subscription.subscriptionDetails.current_period_end * 1000), "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p>Valor: R$ {(subscription.subscriptionDetails.items.data[0].price.unit_amount / 100).toFixed(2)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Gerencie sua assinatura e pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => billingPortalMutation.mutate()}
                disabled={billingPortalMutation.isPending}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {billingPortalMutation.isPending ? "Carregando..." : "Gerenciar Pagamentos"}
              </Button>
              
              {subscription?.subscriptionStatus === "trialing" && (
                <Button
                  variant="outline"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelMutation.isPending ? "Cancelando..." : "Cancelar Período de Teste"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        </TabsContent>

        {/* Aba de Planos */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Plano</CardTitle>
              <CardDescription>
                Escolha o plano que melhor se adapta às suas necessidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans?.map((plan: any) => (
                  <Card key={plan.id} className={`relative ${subscription?.planType === plan.type ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getPlanIcon(plan.type)}
                          {plan.name}
                        </CardTitle>
                        {subscription?.planType === plan.type && (
                          <Badge variant="default">Atual</Badge>
                        )}
                      </div>
                      <CardDescription className="text-2xl font-bold">
                        R$ {plan.price}
                        <span className="text-sm font-normal text-gray-500">/mês</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {subscription?.planType !== plan.type && (
                        <Button
                          className="w-full mt-4"
                          onClick={() => changePlanMutation.mutate(plan.type)}
                          disabled={changePlanMutation.isPending}
                        >
                          {changePlanMutation.isPending ? "Alterando..." : "Alterar para este plano"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Equipe - apenas para plano empresarial */}
        {isEnterprisePlan && (
          <TabsContent value="team" className="space-y-6">
            <TeamManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}