import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HandCoins, CreditCard, Plus, Clock, CheckCircle, XCircle, Search, Filter, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanForm from "@/components/forms/loan-form";
import DebtForm from "@/components/forms/debt-form";
import PlanGuard from "@/components/auth/plan-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Loan, Debt, Account } from "@shared/schema";

export default function Emprestimos() {
  return (
    <PlanGuard requiredPlan="premium">
      <EmprestimosContent />
    </PlanGuard>
  );
}

function EmprestimosContent() {
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    type: 'loan' | 'debt';
    id: number;
    status: string;
  } | null>(null);
  
  // Filter states
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>("todos");
  const [debtSearch, setDebtSearch] = useState("");
  const [debtStatusFilter, setDebtStatusFilter] = useState<string>("todos");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: loans, isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const { data: debts, isLoading: debtsLoading } = useQuery<Debt[]>({
    queryKey: ["/api/debts"],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const totalLoansGiven = loans?.reduce((sum, l) => sum + parseFloat(l.amount), 0) || 0;
  const pendingLoans = loans?.filter(l => l.status === 'pendente') || [];
  const totalDebts = debts?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  const pendingDebts = debts?.filter(d => d.status === 'pendente') || [];

  // Filter functions
  const filteredLoans = loans?.filter(loan => {
    const matchesSearch = loan.borrower.toLowerCase().includes(loanSearch.toLowerCase()) ||
                         (loan.description || '').toLowerCase().includes(loanSearch.toLowerCase());
    const matchesStatus = loanStatusFilter === "todos" || loan.status === loanStatusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredDebts = debts?.filter(debt => {
    const matchesSearch = debt.creditor.toLowerCase().includes(debtSearch.toLowerCase()) ||
                         (debt.description || '').toLowerCase().includes(debtSearch.toLowerCase());
    const matchesStatus = debtStatusFilter === "todos" || debt.status === debtStatusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Update status mutations
  const updateLoanStatusMutation = useMutation({
    mutationFn: async ({ loanId, status, accountId }: { loanId: number; status: string; accountId?: number }) => {
      const payload: any = { status };
      if (accountId) payload.accountId = accountId;
      return await apiRequest("PUT", `/api/loans/${loanId}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status do empréstimo foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDebtStatusMutation = useMutation({
    mutationFn: async ({ debtId, status, accountId }: { debtId: number; status: string; accountId?: number }) => {
      const payload: any = { status };
      if (accountId) payload.accountId = accountId;
      return await apiRequest("PUT", `/api/debts/${debtId}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status da dívida foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (type: 'loan' | 'debt', id: number, status: string) => {
    if (status === 'pago') {
      // Open account selection modal for payment
      setPendingStatusUpdate({ type, id, status });
      setIsAccountModalOpen(true);
    } else {
      // Direct status update for cancellation
      if (type === 'loan') {
        updateLoanStatusMutation.mutate({ loanId: id, status });
      } else {
        updateDebtStatusMutation.mutate({ debtId: id, status });
      }
    }
  };

  const handleAccountSelection = (accountId: number) => {
    if (!pendingStatusUpdate) return;
    
    const { type, id, status } = pendingStatusUpdate;
    
    if (type === 'loan') {
      updateLoanStatusMutation.mutate({ loanId: id, status, accountId });
    } else {
      updateDebtStatusMutation.mutate({ debtId: id, status, accountId });
    }
    
    setIsAccountModalOpen(false);
    setPendingStatusUpdate(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pendente':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-amber-100 text-amber-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Empréstimos e Dívidas</h1>
            <p className="text-slate-600">Gerencie empréstimos dados e dívidas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Empréstimos Dados
              </CardTitle>
              <HandCoins className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(totalLoansGiven)}
              </div>
              <p className="text-xs text-slate-500">
                {loans?.length || 0} empréstimos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pendentes (Empréstimos)
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingLoans.length}
              </div>
              <p className="text-xs text-slate-500">
                A receber
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total em Dívidas
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDebts)}
              </div>
              <p className="text-xs text-slate-500">
                {debts?.length || 0} dívidas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pendentes (Dívidas)
              </CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingDebts.length}
              </div>
              <p className="text-xs text-slate-500">
                A pagar
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="loans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans" className="flex items-center space-x-2">
              <HandCoins className="h-4 w-4" />
              <span>Empréstimos Dados</span>
            </TabsTrigger>
            <TabsTrigger value="debts" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Dívidas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <CardTitle>Empréstimos Dados</CardTitle>
                  <Button
                    onClick={() => setIsLoanModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Empréstimo
                  </Button>
                </div>
                
                {/* Filtros para Empréstimos */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nome ou descrição..."
                      value={loanSearch}
                      onChange={(e) => setLoanSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={loanStatusFilter} onValueChange={setLoanStatusFilter}>
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loansLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-slate-200 rounded w-32"></div>
                            <div className="h-3 bg-slate-200 rounded w-24 mt-1"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-slate-200 rounded w-20"></div>
                          <div className="h-3 bg-slate-200 rounded w-16 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !loans || loans.length === 0 ? (
                  <div className="text-center py-8">
                    <HandCoins className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum empréstimo</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Comece registrando um empréstimo dado.
                    </p>
                    <div className="mt-6">
                      <Button
                        onClick={() => setIsLoanModalOpen(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Empréstimo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            {getStatusIcon(loan.status)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{loan.borrower}</p>
                            <p className="text-sm text-slate-500">
                              {loan.description || 'Sem descrição'}
                            </p>
                            {loan.interestRate && (
                              <p className="text-sm text-slate-500">
                                Taxa: {loan.interestRate}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(loan.amount)}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStatusColor(loan.status)}>
                                {getStatusLabel(loan.status)}
                              </Badge>
                            </div>
                            {loan.dueDate && (
                              <p className="text-sm text-slate-500 mt-1">
                                Vence: {formatDate(loan.dueDate)}
                              </p>
                            )}
                          </div>
                          
                          {/* Menu de ações apenas para status pendente */}
                          {loan.status === 'pendente' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate('loan', loan.id, 'pago')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate('loan', loan.id, 'cancelado')}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancelar Empréstimo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <CardTitle>Dívidas</CardTitle>
                  <Button
                    onClick={() => setIsDebtModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Dívida
                  </Button>
                </div>
                
                {/* Filtros para Dívidas */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por credor ou descrição..."
                      value={debtSearch}
                      onChange={(e) => setDebtSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={debtStatusFilter} onValueChange={setDebtStatusFilter}>
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {debtsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-slate-200 rounded w-32"></div>
                            <div className="h-3 bg-slate-200 rounded w-24 mt-1"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-slate-200 rounded w-20"></div>
                          <div className="h-3 bg-slate-200 rounded w-16 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !debts || debts.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhuma dívida</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Comece registrando uma dívida.
                    </p>
                    <div className="mt-6">
                      <Button
                        onClick={() => setIsDebtModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Dívida
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDebts.map((debt) => (
                      <div key={debt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            {getStatusIcon(debt.status)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{debt.creditor}</p>
                            <p className="text-sm text-slate-500">
                              {debt.description || 'Sem descrição'}
                            </p>
                            {debt.interestRate && (
                              <p className="text-sm text-slate-500">
                                Taxa: {debt.interestRate}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(debt.amount)}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStatusColor(debt.status)}>
                                {getStatusLabel(debt.status)}
                              </Badge>
                            </div>
                            {debt.dueDate && (
                              <p className="text-sm text-slate-500 mt-1">
                                Vence: {formatDate(debt.dueDate)}
                              </p>
                            )}
                          </div>
                          
                          {/* Menu de ações apenas para status pendente */}
                          {debt.status === 'pendente' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate('debt', debt.id, 'pago')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate('debt', debt.id, 'cancelado')}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancelar Dívida
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Empréstimo</DialogTitle>
            </DialogHeader>
            <LoanForm onSuccess={() => setIsLoanModalOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Dívida</DialogTitle>
            </DialogHeader>
            <DebtForm onSuccess={() => setIsDebtModalOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Account Selection Modal for Payment */}
        <Dialog open={isAccountModalOpen} onOpenChange={(open) => {
          setIsAccountModalOpen(open);
          if (!open) setPendingStatusUpdate(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecionar Conta para Movimentação</DialogTitle>
              <p className="text-sm text-slate-600">
                Escolha a conta que receberá ou pagará o valor {pendingStatusUpdate?.type === 'loan' ? 'do empréstimo' : 'da dívida'}.
              </p>
            </DialogHeader>
            <div className="space-y-3">
              {accounts?.map((account) => (
                <Button
                  key={account.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => handleAccountSelection(account.id)}
                >
                  <div className="text-left">
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-slate-500">{account.bank} • {account.type}</p>
                    <p className="text-sm font-medium text-green-600">
                      Saldo: {formatCurrency(account.balance)}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}