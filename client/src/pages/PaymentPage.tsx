import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import PaymentMethodSelector from '@/components/payment/payment-method-selector';
import StripePaymentForm from '@/components/payment/stripe-payment-form';
import AngolanPaymentInstructions from '@/components/payment/angolan-payment-instructions';
import { apiRequest } from '@/lib/queryClient';
import type { PaymentMethod } from '@shared/schema';

interface PaymentPageProps {
  planType?: string;
  source?: 'subscription' | 'upgrade';
}

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'method' | 'payment' | 'confirmation'>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    const sourceParam = urlParams.get('source');
    
    if (!planParam) {
      setLocation('/subscription');
      return;
    }
  }, [setLocation]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/plans"],
    throwOnError: false,
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    throwOnError: false,
  });

  // Get selected plan from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    if (plans && Array.isArray(plans) && planParam) {
      const plan = plans.find((p: any) => p.type === planParam);
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [plans]);

  const createPaymentMutation = useMutation({
    mutationFn: async ({ planId, paymentMethodId }: { planId: number; paymentMethodId: number }) => {
      const response = await apiRequest("POST", "/api/payments/initiate", {
        planId,
        paymentMethodId,
      });
      console.log('Payment transaction response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Payment transaction created:', data);
      setPaymentTransaction(data);
      setStep('payment');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleProceedToPayment = () => {
    if (!selectedMethod || !selectedPlan) return;
    
    createPaymentMutation.mutate({
      planId: selectedPlan.id,
      paymentMethodId: selectedMethod.id,
    });
  };

  const handlePaymentSuccess = () => {
    setStep('confirmation');
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  if (plansLoading || !selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/subscription">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Finalizar Assinatura
            </h1>
            <p className="text-gray-600 mb-6">
              Confirme seu plano e escolha o método de pagamento
            </p>
            
            {/* Plan Summary */}
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {selectedPlan.name}
                </CardTitle>
                <CardDescription className="text-2xl font-bold text-blue-600">
                  {selectedPlan.price.toLocaleString()} Kz
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Payment Steps */}
        <div className="space-y-8">
          {step === 'method' && (
            <Card>
              <CardHeader>
                <CardTitle>Escolha o método de pagamento</CardTitle>
                <CardDescription>
                  Selecione como deseja pagar sua assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  planType={selectedPlan.type}
                  onMethodSelect={handleMethodSelect}
                  selectedMethodId={selectedMethod?.id}
                />
                
                {selectedMethod && (
                  <div className="mt-6 pt-6 border-t">
                    <Button
                      onClick={handleProceedToPayment}
                      disabled={createPaymentMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {createPaymentMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        `Continuar com ${selectedMethod.displayName}`
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 'payment' && selectedMethod && paymentTransaction && (
            <div>
              {selectedMethod.name === 'stripe' ? (
                <StripePaymentForm
                  transaction={paymentTransaction}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setStep('method')}
                />
              ) : (
                <AngolanPaymentInstructions
                  transaction={paymentTransaction}
                  method={selectedMethod}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setStep('method')}
                />
              )}
            </div>
          )}

          {step === 'confirmation' && (
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">
                  {selectedMethod?.name === 'stripe' ? 'Pagamento Processado!' : 'Pagamento Enviado!'}
                </CardTitle>
                <CardDescription className="text-lg">
                  {selectedMethod?.name === 'stripe' 
                    ? 'Sua assinatura foi ativada com sucesso.'
                    : 'Seu pagamento está sendo analisado. Você receberá uma confirmação em breve.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Próximos passos:</h4>
                  <ul className="text-sm text-left space-y-1">
                    {selectedMethod?.name === 'stripe' ? (
                      <>
                        <li>• Sua assinatura está ativa imediatamente</li>
                        <li>• Você receberá um email de confirmação</li>
                        <li>• Pode começar a usar todas as funcionalidades</li>
                      </>
                    ) : (
                      <>
                        <li>• Nossa equipe analisará seu comprovante</li>
                        <li>• Você receberá um email em até 24 horas</li>
                        <li>• Continue usando o período de teste</li>
                      </>
                    )}
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <Button className="w-full" size="lg">
                      Ir para o Dashboard
                    </Button>
                  </Link>
                  <Link href="/subscription">
                    <Button variant="outline" className="w-full">
                      Gerenciar Assinatura
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}