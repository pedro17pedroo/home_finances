import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TransactionForm from "@/components/forms/transaction-form";
import SavingsGoalForm from "@/components/forms/savings-goal-form";
import TransactionLimitGuard from "@/components/auth/transaction-limit-guard";

export default function QuickActions() {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  return (
    <>
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <TransactionLimitGuard>
              <Button
                onClick={() => setIsIncomeModalOpen(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Receita
              </Button>
            </TransactionLimitGuard>
            <TransactionLimitGuard>
              <Button
                onClick={() => setIsExpenseModalOpen(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Minus className="w-5 h-5 mr-2" />
                Registrar Despesa
              </Button>
            </TransactionLimitGuard>
            <Button
              onClick={() => setIsGoalModalOpen(true)}
              className="w-full bg-primary hover:bg-blue-700 text-white"
            >
              <Target className="w-5 h-5 mr-2" />
              Criar Meta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isIncomeModalOpen} onOpenChange={setIsIncomeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Receita</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultType="receita"
            onSuccess={() => setIsIncomeModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Despesa</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultType="despesa"
            onSuccess={() => setIsExpenseModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Meta de Poupança</DialogTitle>
          </DialogHeader>
          <SavingsGoalForm onSuccess={() => setIsGoalModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
