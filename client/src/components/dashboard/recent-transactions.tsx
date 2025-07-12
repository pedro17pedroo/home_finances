import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/types";
import { Plus, Minus } from "lucide-react";
import type { Transaction } from "@shared/schema";

export default function RecentTransactions() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions?limit=5");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="border border-slate-200 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-slate-200 rounded-full mr-3"></div>
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-slate-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Transações Recentes
          </CardTitle>
          <a href="/relatorios" className="text-sm text-primary hover:text-blue-700">
            Ver todas
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhuma transação encontrada
            </div>
          ) : (
            transactions?.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'receita' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {transaction.type === 'receita' ? (
                      <Plus className="w-5 h-5 text-green-600" />
                    ) : (
                      <Minus className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-900">
                      {transaction.description || CATEGORY_LABELS[transaction.category as keyof typeof CATEGORY_LABELS]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {CATEGORY_LABELS[transaction.category as keyof typeof CATEGORY_LABELS]}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
