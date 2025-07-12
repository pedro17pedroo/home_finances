import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HandCoins, CreditCard, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanForm from "@/components/forms/loan-form";
import DebtForm from "@/components/forms/debt-form";
import PlanGuard from "@/components/auth/plan-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Loan, Debt } from "@shared/schema";

export default function Emprestimos() {
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  const { data: loans, isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const { data: debts, isLoading: debtsLoading } = useQuery<Debt[]>({
    queryKey: ["/api/debts"],
  });

  const totalLoansGiven = loans?.reduce((sum, l) => sum + parseFloat(l.amount), 0) || 0;
  const pendingLoans = loans?.filter(l => l.status === 'pendente') || [];
  const totalDebts = debts?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  const pendingDebts = debts?.filter(d => d.status === 'pendente') || [];

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
    <PlanGuard requiredPlan="premium">
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
                <div className="flex justify-between items-center">
                  <CardTitle>Empréstimos Dados</CardTitle>
                  <Button
                    onClick={() => setIsLoanModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Empréstimo
                  </Button>
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
                    {loans?.map((loan) => (
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
                <div className="flex justify-between items-center">
                  <CardTitle>Dívidas</CardTitle>
                  <Button
                    onClick={() => setIsDebtModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Dívida
                  </Button>
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
                    {debts?.map((debt) => (
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
      </main>
    </PlanGuard>
  );
}