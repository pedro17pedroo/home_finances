import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SavingsGoalForm from "@/components/forms/savings-goal-form";
import type { SavingsGoal, Account } from "@shared/schema";

export default function SavingsGoals() {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const { data: goals, isLoading } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts/savings"],
  });

  const totalSavings = accounts?.reduce((sum, a) => sum + parseFloat(a.balance), 0) || 0;

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Metas de Poupança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-slate-200 rounded mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Metas de Poupança
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsGoalModalOpen(true)}
              className="text-primary hover:text-blue-700"
            >
              + Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhuma meta de poupança criada
              </div>
            ) : (
              goals?.map((goal) => {
                // Use the saved currentAmount from the goal
                const currentAmount = parseFloat(goal.currentAmount || '0');
                const targetAmount = parseFloat(goal.targetAmount);
                const percentage = calculatePercentage(currentAmount, targetAmount);
                const remainingAmount = targetAmount - currentAmount;
                
                const monthsRemaining = goal.targetDate ? 
                  Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)) : 
                  null;

                return (
                  <div key={goal.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-900">{goal.name}</h4>
                      <span className="text-sm text-slate-500">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="mb-2 bg-[#2463eb]" />
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>
                        {formatCurrency(currentAmount)} de {formatCurrency(targetAmount)}
                      </span>
                      <span>
                        {monthsRemaining ? `${monthsRemaining} meses restantes` : 'Sem prazo definido'}
                      </span>
                    </div>
                    {remainingAmount > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Faltam {formatCurrency(remainingAmount)} para atingir a meta
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

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
