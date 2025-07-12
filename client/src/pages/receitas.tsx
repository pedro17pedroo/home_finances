import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TransactionForm from "@/components/forms/transaction-form";
import TransactionLimitGuard from "@/components/auth/transaction-limit-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Transaction } from "@shared/schema";

export default function Receitas() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      const data = await response.json();
      return data.filter((t: Transaction) => t.type === 'receita');
    },
  });

  const totalReceitas = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  return (
    <TransactionLimitGuard>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Receitas</h1>
            <p className="text-slate-600">Gerencie suas fontes de renda</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Receita
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total de Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totalReceitas)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Este Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Média Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Receitas</CardTitle>
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
                <p className="text-slate-500 text-lg">Nenhuma receita registrada</p>
                <p className="text-slate-400 mt-2">Clique em "Nova Receita" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {transaction.description || CATEGORY_LABELS[transaction.category as keyof typeof CATEGORY_LABELS]}
                        </p>
                        <p className="text-sm text-slate-500">
                          {CATEGORY_LABELS[transaction.category as keyof typeof CATEGORY_LABELS]}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-slate-500">
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
            <DialogTitle>Nova Receita</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultType="receita"
            onSuccess={() => setIsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </TransactionLimitGuard>
  );
}
