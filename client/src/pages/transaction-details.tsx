import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Download,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  User,
  Hash,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface TransactionDetails {
  id: number;
  amount: string;
  finalAmount: string;
  discountAmount: string;
  status: string;
  paymentReference: string;
  processedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  planName: string;
  planType: string;
  paymentMethodName: string;
  currency: string;
  stripeSessionId?: string;
  metadata?: any;
}

export default function TransactionDetailsPage() {
  const [match, params] = useRoute("/transaction-details/:id");
  const transactionId = params?.id;

  const { data: transaction, isLoading, error } = useQuery<TransactionDetails>({
    queryKey: ["/api/payment/transaction", transactionId],
    enabled: !!transactionId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhado</Badge>;
      case "processing":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const downloadReceipt = async () => {
    if (!transaction) return;
    
    try {
      // Fetch the PDF receipt
      const response = await fetch(`/api/payment/receipt/${transaction.id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar recibo PDF');
      }
      
      const pdfBlob = await response.blob();
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo-${transaction.paymentReference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao baixar recibo:', error);
      // Could show a toast error here
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Transação não encontrada</h2>
          <p className="text-gray-600 mb-4">
            A transação solicitada não foi encontrada ou você não tem permissão para visualizá-la.
          </p>
          <Link href="/subscription">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Assinatura
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subscription">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detalhes da Transação</h1>
            <p className="text-gray-600">#{transaction.paymentReference}</p>
          </div>
        </div>
        
        {transaction.status === 'completed' && (
          <div className="flex gap-2">
            <Button onClick={downloadReceipt} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Baixar Recibo (PDF)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/api/payment/receipt/${transaction.id}`, '_blank')}
              className="flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Ver Recibo
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Transaction Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Informações da Transação
                </CardTitle>
                {getStatusBadge(transaction.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Plano</p>
                    <p className="font-medium">{transaction.planName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Método de Pagamento</p>
                    <p className="font-medium">{transaction.paymentMethodName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Referência</p>
                    <p className="font-medium font-mono">{transaction.paymentReference}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Data da Transação</p>
                    <p className="font-medium">
                      {format(new Date(transaction.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Detalhes Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor do Plano:</span>
                  <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                </div>
                
                {transaction.discountAmount && parseFloat(transaction.discountAmount) > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Desconto Aplicado:</span>
                    <span className="font-medium">-{formatCurrency(transaction.discountAmount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Valor Final:</span>
                  <span>{formatCurrency(transaction.finalAmount)}</span>
                </div>
                
                <div className="text-sm text-gray-500">
                  Moeda: {transaction.currency}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline and Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status da Transação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Transação Criada</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                {transaction.processedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Pagamento Processado</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(transaction.processedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
                
                {transaction.expiresAt && transaction.status === 'pending' && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Expira em</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(transaction.expiresAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          {transaction.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {transaction.stripeSessionId && (
                    <div>
                      <span className="text-gray-600">ID da Sessão Stripe:</span>
                      <p className="font-mono text-xs break-all">{transaction.stripeSessionId}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}