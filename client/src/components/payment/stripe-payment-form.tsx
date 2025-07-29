import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ExternalLink, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StripePaymentFormProps {
  transaction: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ transaction, onSuccess, onCancel }: StripePaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStripeSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payment/stripe/create-session", {
        transactionId: transaction.id,
        planId: transaction.planId,
      });
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStripePayment = () => {
    setIsProcessing(true);
    createStripeSessionMutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Pagamento com Cartão</CardTitle>
        <CardDescription className="text-lg">
          Você será redirecionado para o checkout seguro do Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">Detalhes do Pagamento:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Plano:</span>
              <span className="font-medium">{transaction.plan?.name || 'Plano Básico'}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor:</span>
              <span className="font-medium">{transaction.finalAmount?.toLocaleString() || transaction.amount?.toLocaleString() || '14500'} Kz</span>
            </div>
            <div className="flex justify-between">
              <span>Método:</span>
              <span className="font-medium">Cartão de Crédito/Débito</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Segurança Garantida</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Processamento 100% seguro via Stripe</li>
            <li>• Certificação PCI DSS nível 1</li>
            <li>• Dados criptografados com SSL</li>
            <li>• Suporte para 3D Secure</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleStripePayment}
            disabled={isProcessing || createStripeSessionMutation.isPending}
            className="w-full"
            size="lg"
          >
            {isProcessing || createStripeSessionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Pagar com Cartão
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
            disabled={isProcessing || createStripeSessionMutation.isPending}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Métodos
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Você será redirecionado para o checkout seguro do Stripe</p>
          <p>Após o pagamento, você retornará automaticamente ao sistema</p>
        </div>
      </CardContent>
    </Card>
  );
}