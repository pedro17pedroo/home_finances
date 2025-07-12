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
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Empréstimos e Dívidas</h1>
            <p className="text-slate-600">Gerencie empréstimos dados e dívidas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <HandCoins className="w-5 h-5 mr-2 text-amber-600" />
                Empréstimos Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(totalLoansGiven)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {loans?.length || 0} empréstimos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="w-5 h-5 mr-2 text-amber-600" />
                Pendentes (Dados)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">
                {pendingLoans.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(pendingLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-red-600" />
                Dívidas Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(totalDebts)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {debts?.length || 0} dívidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <XCircle className="w-5 h-5 mr-2 text-red-600" />
                Dívidas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {pendingDebts.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(pendingDebts.reduce((sum, d) => sum + parseFloat(d.amount), 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="loans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">Empréstimos Dados</TabsTrigger>
            <TabsTrigger value="debts">Dívidas</TabsTrigger>
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
                          <div className="h-4 bg-slate-200 rounded w-24"></div>
                          <div className="h-3 bg-slate-200 rounded w-20 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loans?.length === 0 ? (
                  <div className="text-center py-12">
                    <HandCoins className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhum empréstimo registrado</p>
                    <p className="text-slate-400 mt-2">Clique em "Novo Empréstimo" para começar</p>
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
                          <div className="h-4 bg-slate-200 rounded w-24"></div>
                          <div className="h-3 bg-slate-200 rounded w-20 mt-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : debts?.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhuma dívida registrada</p>
                    <p className="text-slate-400 mt-2">Clique em "Nova Dívida" para começar</p>
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
      </main>

      <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Empréstimo</DialogTitle>
          </DialogHeader>
          <LoanForm onSuccess={() => setIsLoanModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Dívida</DialogTitle>
          </DialogHeader>
          <DebtForm onSuccess={() => setIsDebtModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
