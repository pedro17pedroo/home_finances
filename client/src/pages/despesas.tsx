import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TransactionForm from "@/components/forms/transaction-form";
import TransactionLimitGuard from "@/components/auth/transaction-limit-guard";
import { formatCurrency, formatDate } from "@/lib/utils";

import type { Transaction } from "@shared/schema";

export default function Despesas() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", "despesas"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      return data.filter((t: Transaction) => t.type === 'despesa');
    },
  });

  const totalDespesas = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  return (
    <TransactionLimitGuard>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Despesas</h1>
            <p className="text-sm sm:text-base text-slate-600">Controle seus gastos</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0 w-full sm:w-auto"
          >
            <Minus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Despesa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="p-4 sm:p-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 break-words">
                {formatCurrency(totalDespesas)}
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 sm:p-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Este Mês</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">
                {formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Média Mensal</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">
                {formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
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
            ) : transactions?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">Nenhuma despesa registrada</p>
                <p className="text-slate-400 mt-2">Clique em "Nova Despesa" para começar</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {transaction.description || transaction.category}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                          {transaction.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-red-600 text-sm sm:text-base">
                        -{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultType="despesa"
            onSuccess={() => setIsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </TransactionLimitGuard>
  );
}
