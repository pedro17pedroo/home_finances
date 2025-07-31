import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Download,
  Calendar,
  CreditCard,
  User,
  FileText,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentTransaction {
  id: number;
  userId: number;
  planId: number;
  paymentMethodId: number;
  amount: string;
  finalAmount: string;
  discountAmount: string;
  campaignId: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  stripeSessionId: string | null;
  metadata: any;
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  plan: {
    id: number;
    name: string;
    type: string;
    price: string;
  };
  paymentMethod: {
    id: number;
    name: string;
    displayName: string;
  };
  campaign: {
    id: number;
    name: string;
    couponCode: string;
  } | null;
  confirmation: {
    id: number;
    paymentProof: string | null;
    bankReference: string | null;
    phoneNumber: string | null;
    notes: string | null;
    paymentDate: string;
    status: 'pending' | 'approved' | 'rejected';
    verifiedBy: number | null;
    verifiedAt: string | null;
    rejectionReason: string | null;
  } | null;
}

export default function PaymentApprovals() {
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/admin/payments/transactions", filterStatus, filterMethod, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterMethod !== "all") params.append("method", filterMethod);
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/admin/payments/transactions?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Falha ao carregar transações');
      }
      
      return response.json();
    },
    throwOnError: false,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/admin/payment-methods"],
    throwOnError: false,
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest("POST", `/api/admin/payments/${transactionId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/transactions"] });
      toast({
        title: "Pagamento aprovado",
        description: "O pagamento foi aprovado com sucesso e a assinatura foi ativada",
      });
      setSelectedTransaction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: number; reason: string }) => {
      return apiRequest("POST", `/api/admin/payments/${transactionId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/transactions"] });
      toast({
        title: "Pagamento rejeitado",
        description: "O pagamento foi rejeitado e o usuário será notificado",
      });
      setSelectedTransaction(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao rejeitar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'processing':
        return <Badge variant="default"><FileText className="h-3 w-3 mr-1" />Processando</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getConfirmationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTransactions = (transactions || []).filter((transaction: PaymentTransaction) => {
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;
    const matchesMethod = filterMethod === "all" || transaction.paymentMethod.name === filterMethod;
    const matchesSearch = !searchTerm || 
      transaction.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toString().includes(searchTerm);
    
    return matchesStatus && matchesMethod && matchesSearch;
  });

  const pendingTransactions = filteredTransactions.filter((t: PaymentTransaction) => t.status === 'processing');
  const completedTransactions = filteredTransactions.filter((t: PaymentTransaction) => t.status === 'completed');
  const rejectedTransactions = filteredTransactions.filter((t: PaymentTransaction) => t.status === 'failed' || t.status === 'rejected');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-300 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-300 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Aprovação de Pagamentos</h2>
          <p className="text-muted-foreground">Gerencie e aprove pagamentos dos usuários</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Email, nome ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="completed">Aprovado</SelectItem>
                  <SelectItem value="failed">Rejeitado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="method">Método</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(paymentMethods || []).map((method: any) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold">{completedTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
                <p className="text-2xl font-bold">{rejectedTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de transações */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingTransactions.length})</TabsTrigger>
          <TabsTrigger value="all">Todas ({filteredTransactions.length})</TabsTrigger>
          <TabsTrigger value="completed">Aprovadas ({completedTransactions.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas ({rejectedTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onViewDetails={setSelectedTransaction}
              showActions={true}
              getStatusBadge={getStatusBadge}
              getConfirmationStatusBadge={getConfirmationStatusBadge}
            />
          ))}
          {pendingTransactions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum pagamento pendente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onViewDetails={setSelectedTransaction}
              showActions={false}
              getStatusBadge={getStatusBadge}
              getConfirmationStatusBadge={getConfirmationStatusBadge}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onViewDetails={setSelectedTransaction}
              showActions={false}
              getStatusBadge={getStatusBadge}
              getConfirmationStatusBadge={getConfirmationStatusBadge}
            />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onViewDetails={setSelectedTransaction}
              showActions={false}
              getStatusBadge={getStatusBadge}
              getConfirmationStatusBadge={getConfirmationStatusBadge}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Pagamento #{selectedTransaction?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <PaymentDetailsContent
              transaction={selectedTransaction}
              onApprove={() => approvePaymentMutation.mutate(selectedTransaction.id)}
              onReject={(reason) => rejectPaymentMutation.mutate({ transactionId: selectedTransaction.id, reason })}
              isApproving={approvePaymentMutation.isPending}
              isRejecting={rejectPaymentMutation.isPending}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              getStatusBadge={getStatusBadge}
              getConfirmationStatusBadge={getConfirmationStatusBadge}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TransactionCardProps {
  transaction: PaymentTransaction;
  onViewDetails: (transaction: PaymentTransaction) => void;
  showActions: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getConfirmationStatusBadge: (status: string) => JSX.Element;
}

function TransactionCard({ transaction, onViewDetails, showActions, getStatusBadge, getConfirmationStatusBadge }: TransactionCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {transaction.user.firstName} {transaction.user.lastName}
                </span>
              </div>
              <Badge variant="outline">{transaction.user.email}</Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Plano</p>
                <p className="font-medium">{transaction.plan.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Método</p>
                <p className="font-medium">{transaction.paymentMethod.displayName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">{parseFloat(transaction.finalAmount).toFixed(2)} Kz</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusBadge(transaction.status)}
              {transaction.confirmation && getConfirmationStatusBadge(transaction.confirmation.status)}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(transaction)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaymentDetailsContentProps {
  transaction: PaymentTransaction;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
  getConfirmationStatusBadge: (status: string) => JSX.Element;
}

function PaymentDetailsContent({
  transaction,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  rejectionReason,
  setRejectionReason,
  getStatusBadge,
  getConfirmationStatusBadge
}: PaymentDetailsContentProps) {
  const canApprove = transaction.status === 'processing' && transaction.confirmation?.status === 'pending';
  const canReject = transaction.status === 'processing' && transaction.confirmation?.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Informações do usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <p className="font-medium">{transaction.user.firstName} {transaction.user.lastName}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="font-medium">{transaction.user.email}</p>
            </div>
            <div>
              <Label>Telefone</Label>
              <p className="font-medium">{transaction.user.phone || 'Não informado'}</p>
            </div>
            <div>
              <Label>ID do Usuário</Label>
              <p className="font-medium">#{transaction.user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plano</Label>
              <p className="font-medium">{transaction.plan.name}</p>
            </div>
            <div>
              <Label>Método</Label>
              <p className="font-medium">{transaction.paymentMethod.displayName}</p>
            </div>
            <div>
              <Label>Valor Original</Label>
              <p className="font-medium">{parseFloat(transaction.amount).toFixed(2)} Kz</p>
            </div>
            <div>
              <Label>Valor Final</Label>
              <p className="font-medium">{parseFloat(transaction.finalAmount).toFixed(2)} Kz</p>
            </div>
            <div>
              <Label>Desconto</Label>
              <p className="font-medium">{parseFloat(transaction.discountAmount).toFixed(2)} Kz</p>
            </div>
            <div>
              <Label>Status</Label>
              <div>{getStatusBadge(transaction.status)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprovante de pagamento */}
      {transaction.confirmation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comprovante de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status da Confirmação</Label>
                <div>{getConfirmationStatusBadge(transaction.confirmation.status)}</div>
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <p className="font-medium">
                  {format(new Date(transaction.confirmation.paymentDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              {transaction.confirmation.bankReference && (
                <div>
                  <Label>Referência Bancária</Label>
                  <p className="font-medium">{transaction.confirmation.bankReference}</p>
                </div>
              )}
              {transaction.confirmation.phoneNumber && (
                <div>
                  <Label>Número de Telefone</Label>
                  <p className="font-medium">{transaction.confirmation.phoneNumber}</p>
                </div>
              )}
            </div>
            
            {transaction.confirmation.notes && (
              <div>
                <Label>Observações</Label>
                <p className="font-medium">{transaction.confirmation.notes}</p>
              </div>
            )}
            
            {transaction.confirmation.paymentProof && (
              <div>
                <Label>Comprovante</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img 
                    src={transaction.confirmation.paymentProof} 
                    alt="Comprovante de pagamento"
                    className="max-w-full h-auto rounded"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {(canApprove || canReject) && (
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              {canApprove && (
                <Button
                  onClick={onApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isApproving ? "Aprovando..." : "Aprovar Pagamento"}
                </Button>
              )}
              
              {canReject && (
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Motivo da rejeição..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => onReject(rejectionReason)}
                    disabled={isRejecting || !rejectionReason.trim()}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isRejecting ? "Rejeitando..." : "Rejeitar Pagamento"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}