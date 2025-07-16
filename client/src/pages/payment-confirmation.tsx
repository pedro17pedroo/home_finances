import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Upload, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PaymentConfirmationPage() {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payment-confirmations"],
    throwOnError: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { paymentId: number; files: FileList; notes?: string }) => {
      const formData = new FormData();
      formData.append("paymentId", data.paymentId.toString());
      
      for (let i = 0; i < data.files.length; i++) {
        formData.append("receipts", data.files[i]);
      }
      
      if (data.notes) {
        formData.append("notes", data.notes);
      }

      return fetch("/api/payment-confirmations/upload", {
        method: "POST",
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-confirmations"] });
      setSelectedFiles(null);
      toast({ 
        title: "Comprovante enviado com sucesso",
        description: "O pagamento será verificado pela nossa equipe"
      });
    },
    onError: (error) => {
      toast({ 
        title: "Erro no envio",
        description: "Não foi possível enviar o comprovante. Tente novamente.",
        variant: "destructive"
      });
    },
  });

  const handleFileUpload = (paymentId: number, notes?: string) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({ 
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um comprovante.",
        variant: "destructive"
      });
      return;
    }

    uploadMutation.mutate({ paymentId, files: selectedFiles, notes });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "confirmed":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      "multicaixa": "Multicaixa Express",
      "unitel_money": "Unitel Money",
      "afrimoney": "AfriMoney",
      "bank_transfer": "Transferência Bancária",
      "stripe": "Cartão de Crédito"
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Confirmação de Pagamentos</h1>
        <p className="text-muted-foreground mt-2">
          Envie seus comprovantes de pagamento para confirmação
        </p>
      </div>

      {payments?.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum pagamento pendente de confirmação encontrado.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {payments?.map((payment: any) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Pagamento #{payment.id}
                    </CardTitle>
                    <CardDescription>
                      {getPaymentMethodName(payment.paymentMethod)} • {payment.amount} Kz
                    </CardDescription>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Referência:</strong> {payment.reference}
                  </div>
                  <div>
                    <strong>Data:</strong> {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  {payment.planName && (
                    <div>
                      <strong>Plano:</strong> {payment.planName}
                    </div>
                  )}
                  {payment.notes && (
                    <div className="col-span-2">
                      <strong>Observações:</strong> {payment.notes}
                    </div>
                  )}
                </div>

                {payment.status === "pending" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor={`files-${payment.id}`} className="text-sm font-medium">
                        Comprovantes de Pagamento
                      </Label>
                      <Input
                        id={`files-${payment.id}`}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setSelectedFiles(e.target.files)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos aceitos: JPG, PNG, PDF. Máximo 10MB por arquivo.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`notes-${payment.id}`} className="text-sm font-medium">
                        Observações (opcional)
                      </Label>
                      <Textarea
                        id={`notes-${payment.id}`}
                        placeholder="Adicione qualquer informação adicional sobre o pagamento..."
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        const notes = (document.getElementById(`notes-${payment.id}`) as HTMLTextAreaElement)?.value;
                        handleFileUpload(payment.id, notes);
                      }}
                      disabled={uploadMutation.isPending}
                      className="w-full"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Comprovante
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {payment.status === "rejected" && payment.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Motivo da Rejeição:</strong> {payment.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {payment.status === "confirmed" && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Pagamento confirmado com sucesso! Sua assinatura foi ativada.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}