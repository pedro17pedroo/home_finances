import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  CreditCard,
  Smartphone,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PaymentMethod, PaymentTransaction } from "@shared/schema";

interface PaymentInstructionsProps {
  method: PaymentMethod;
  transaction: PaymentTransaction;
  onPaymentConfirmed: () => void;
}

export default function PaymentInstructions({ 
  method, 
  transaction, 
  onPaymentConfirmed 
}: PaymentInstructionsProps) {
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const submitConfirmationMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append('transactionId', transaction.id.toString());
      formData.append('bankReference', data.bankReference);
      formData.append('phoneNumber', data.phoneNumber);
      formData.append('notes', data.notes);
      if (data.paymentProof) {
        formData.append('paymentProof', data.paymentProof);
      }
      
      return apiRequest("POST", "/api/payments/confirm", formData);
    },
    onSuccess: () => {
      toast({
        title: "Comprovante enviado!",
        description: "Seu pagamento será verificado em breve. Você receberá uma confirmação por email.",
      });
      onPaymentConfirmed();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar comprovante",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setPaymentProof(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Informação copiada para a área de transferência",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentProof) {
      toast({
        title: "Comprovante obrigatório",
        description: "Por favor, envie o comprovante de pagamento",
        variant: "destructive",
      });
      return;
    }

    submitConfirmationMutation.mutate({
      bankReference,
      phoneNumber,
      notes,
      paymentProof,
    });
  };

  const getMethodIcon = () => {
    switch (method.name) {
      case 'multicaixa':
      case 'unitel_money':
      case 'afrimoney':
        return Smartphone;
      case 'bank_transfer':
        return Building2;
      default:
        return CreditCard;
    }
  };

  const Icon = getMethodIcon();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-full">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Instruções de Pagamento</CardTitle>
              <CardDescription>
                {method.displayName} - {method.processingTime}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Valor a pagar</Label>
              <div className="text-2xl font-bold text-green-600">
                {parseFloat(transaction.finalAmount).toFixed(2)} Kz
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Referência</Label>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-muted p-1 rounded">
                  {transaction.id.toString().padStart(8, '0')}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(transaction.id.toString().padStart(8, '0'))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Tempo limite:</strong> Este pagamento expira em{' '}
              {transaction.expiresAt 
                ? new Date(transaction.expiresAt).toLocaleString('pt-AO')
                : '24 horas'
              }
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Instruções detalhadas:</Label>
            <div className="bg-muted p-4 rounded-lg">
              <div className="whitespace-pre-wrap text-sm">
                {method.instructions || 'Instruções não disponíveis'}
              </div>
            </div>
          </div>

          {method.fees && (
            <div className="text-sm text-muted-foreground">
              <strong>Taxas:</strong> {method.fees}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Enviar Comprovante</span>
          </CardTitle>
          <CardDescription>
            Após efetuar o pagamento, envie o comprovante para confirmar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="paymentProof">Comprovante de Pagamento *</Label>
              <Input
                id="paymentProof"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-1"
                required
              />
              {paymentProof && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                  <FileText className="h-4 w-4" />
                  <span>{paymentProof.name}</span>
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </div>

            {method.name === 'bank_transfer' && (
              <div>
                <Label htmlFor="bankReference">Referência Bancária</Label>
                <Input
                  id="bankReference"
                  placeholder="Número da transferência ou comprovante"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {(method.name === 'multicaixa' || method.name === 'unitel_money' || method.name === 'afrimoney') && (
              <div>
                <Label htmlFor="phoneNumber">Número de Telefone</Label>
                <Input
                  id="phoneNumber"
                  placeholder="Número usado para o pagamento"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione qualquer informação adicional..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={submitConfirmationMutation.isPending}
            >
              {submitConfirmationMutation.isPending ? "Enviando..." : "Enviar Comprovante"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Após enviar o comprovante, nosso time verificará o pagamento
          em até 24 horas. Você receberá uma confirmação por email quando o pagamento for aprovado.
        </AlertDescription>
      </Alert>
    </div>
  );
}