import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AccountLimitGuard from "@/components/auth/account-limit-guard";
import type { Account } from "@shared/schema";

export default function AccountManagement() {
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Contas e Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Contas e Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts?.map((account) => (
              <div key={account.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-900">{account.bank}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    account.type === 'poupanca' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {account.type === 'poupanca' ? 'Poupança' : 'Corrente'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {formatCurrency(account.balance)}
                </p>
                {account.interestRate && (
                  <p className="text-sm text-slate-500 mb-3">
                    Taxa: {account.interestRate}% a.m.
                  </p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600">
                    {account.type === 'poupanca' ? 'Rendimento mensal' : 'Disponível'}
                  </span>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                    <Edit className="w-4 h-4 mr-1" />
                    Atualizar
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <div className="flex items-center justify-center h-24">
                <AccountLimitGuard>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="flex flex-col items-center text-slate-500 hover:text-slate-700"
                  >
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Adicionar Conta</span>
                  </Button>
                </AccountLimitGuard>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddAccountModalOpen} onOpenChange={setIsAddAccountModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Conta</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-slate-500">
            Formulário de conta será implementado aqui
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
