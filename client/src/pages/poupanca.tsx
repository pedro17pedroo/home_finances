import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SavingsGoalForm from "@/components/forms/savings-goal-form";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import type { SavingsGoal, Account } from "@shared/schema";

export default function Poupanca() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const { data: goals, isLoading: goalsLoading } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      return data.filter((a: Account) => a.type === 'poupanca');
    },
  });

  const totalSavings = accounts?.reduce((sum, a) => sum + parseFloat(a.balance), 0) || 0;
  const totalGoals = goals?.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0) || 0;
  const totalCurrentGoals = goals?.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0) || 0;

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Poupança</h1>
            <p className="text-slate-600">Gerencie suas economias e metas</p>
          </div>
          <Button
            onClick={() => setIsGoalModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Target className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total em Poupança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totalSavings)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {goals?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valor das Metas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(totalGoals)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Contas Poupança</CardTitle>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                      <div className="h-20 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : accounts?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-lg">Nenhuma conta poupança cadastrada</p>
                  <p className="text-slate-400 mt-2">Adicione suas contas para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts?.map((account) => (
                    <div key={account.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-slate-900">{account.bank}</h4>
                          <p className="text-sm text-slate-500">{account.name}</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Poupança
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mb-2">
                        {formatCurrency(account.balance)}
                      </p>
                      {account.interestRate && (
                        <p className="text-sm text-slate-500">
                          Taxa: {account.interestRate}% a.m.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metas de Poupança</CardTitle>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                      <div className="h-20 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : goals?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-lg">Nenhuma meta de poupança criada</p>
                  <p className="text-slate-400 mt-2">Crie sua primeira meta para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals?.map((goal) => {
                    const currentAmount = parseFloat(goal.currentAmount);
                    const targetAmount = parseFloat(goal.targetAmount);
                    const percentage = calculatePercentage(currentAmount, targetAmount);
                    
                    const monthsRemaining = goal.targetDate ? 
                      Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)) : 
                      null;

                    return (
                      <div key={goal.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-slate-900">{goal.name}</h4>
                          <span className="text-sm text-slate-500">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="mb-2" />
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>
                            {formatCurrency(currentAmount)} de {formatCurrency(targetAmount)}
                          </span>
                          <span>
                            {monthsRemaining ? `${monthsRemaining} meses` : 'Sem prazo'}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-slate-500 mt-2">{goal.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Meta de Poupança</DialogTitle>
          </DialogHeader>
          <SavingsGoalForm onSuccess={() => setIsGoalModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
