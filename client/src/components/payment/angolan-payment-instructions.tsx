import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Smartphone, 
  Building2, 
  Copy, 
  CheckCircle, 
  Upload,
  ArrowLeft,
  Clock,
  AlertCircle 
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { PaymentMethod } from '@shared/schema';

interface AngolanPaymentInstructionsProps {
  transaction: any;
  method: PaymentMethod;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AngolanPaymentInstructions({ 
  transaction, 
  method, 
  onSuccess, 
  onCancel 
}: AngolanPaymentInstructionsProps) {
  console.log('AngolanPaymentInstructions - transaction prop:', transaction);
  
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitProofMutation = useMutation({
    mutationFn: async () => {
      if (!paymentProof) {
        throw new Error("Comprovante de pagamento é obrigatório");
      }

      console.log('Transaction object:', transaction);

      const formData = new FormData();
      formData.append('transactionId', String(transaction.id || ''));
      formData.append('paymentProof', paymentProof);
      formData.append('bankReference', bankReference || '');
      formData.append('phoneNumber', phoneNumber || '');

      const response = await fetch("/api/payment/submit-proof", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar comprovante");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comprovante enviado!",
        description: "Seu comprovante foi enviado e está sendo analisado.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar comprovante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem (JPG, PNG) ou PDF",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setPaymentProof(file);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
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
        return Smartphone;
    }
  };

  const getInstructions = () => {
    try {
      return method.instructions || "Instruções não disponíveis";
    } catch {
      return "Instruções não disponíveis";
    }
  };

  const getBankDetails = () => {
    if (method.name !== 'bank_transfer') return null;
    
    try {
      const config = typeof method.config === 'string' ? JSON.parse(method.config) : method.config;
      return config?.banks || [];
    } catch (error) {
      console.error('Error parsing bank config:', error);
      return [];
    }
  };

  const Icon = getMethodIcon();
  const banks = getBankDetails();

  return (
    <div className="space-y-6">
      {/* Payment Details */}
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{method.displayName}</CardTitle>
          <CardDescription className="text-lg">
            Siga as instruções abaixo para completar seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 rounded-lg mb-6">
            <h4 className="font-semibold mb-2">Detalhes do Pagamento:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Valor:</span>
                <span className="font-medium">
                  {transaction.amount ? `${transaction.amount.toLocaleString()} Kz` : 'Valor não disponível'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tempo de processamento:</span>
                <span className="font-medium">{method.processingTime || '1-3 dias úteis'}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="space-y-4">
            
            {method.name === 'bank_transfer' && banks.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-semibold">Instruções de Pagamento:</h4>
                {banks.map((bank: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h5 className="font-semibold mb-3">{bank.name}</h5>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Titular:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{bank.account_holder || bank.accountHolder}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(bank.account_holder || bank.accountHolder, 'Titular')}
                          >
                            {copied === 'Titular' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Conta:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">{bank.account_number || bank.accountNumber}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(bank.account_number || bank.accountNumber, 'Conta')}
                          >
                            {copied === 'Conta' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      {bank.iban && (
                        <div className="flex justify-between">
                          <span>IBAN:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium font-mono">{bank.iban}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(bank.iban, 'IBAN')}
                            >
                              {copied === 'IBAN' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{getInstructions()}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proof Submission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Enviar Comprovante de Pagamento
          </CardTitle>
          <CardDescription>
            Após realizar o pagamento, envie o comprovante para verificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment-proof">Comprovante de Pagamento *</Label>
            <Input
              id="payment-proof"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileUpload}
              className="mt-1"
              required
            />
            {paymentProof && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{paymentProof.name}</span>
                <span className="text-gray-500">({(paymentProof.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: JPG, PNG, PDF. Máximo 10MB.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank-reference">Referência Bancária</Label>
              <Input
                id="bank-reference"
                placeholder="Ex: 123456789"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone-number">Número de Telefone</Label>
              <Input
                id="phone-number"
                placeholder="Ex: +244 999 999 999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">Verificação Manual</p>
                <ul className="space-y-1">
                  <li>• Nossa equipe analisará seu comprovante em até 24 horas</li>
                  <li>• Você receberá um email de confirmação</li>
                  <li>• Continue usando o período de teste enquanto aguarda</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => submitProofMutation.mutate()}
              disabled={!paymentProof || submitProofMutation.isPending}
              className="w-full"
              size="lg"
            >
              {submitProofMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando Comprovante...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enviar Comprovante
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
              disabled={submitProofMutation.isPending}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Métodos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}