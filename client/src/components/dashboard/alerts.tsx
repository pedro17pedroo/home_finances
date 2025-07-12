import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Loan, Debt, ExpensesByCategory } from "@/lib/types";

export default function Alerts() {
  const { data: loans } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const { data: debts } = useQuery<Debt[]>({
    queryKey: ["/api/debts"],
  });

  const { data: expensesByCategory } = useQuery<ExpensesByCategory[]>({
    queryKey: ["/api/dashboard/expenses-by-category"],
  });

  const alerts = [];

  // Check for loans/debts due soon
  const upcomingLoans = loans?.filter(loan => {
    if (!loan.dueDate) return false;
    const dueDate = new Date(loan.dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0 && loan.status === 'pendente';
  });

  const upcomingDebts = debts?.filter(debt => {
    if (!debt.dueDate) return false;
    const dueDate = new Date(debt.dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0 && debt.status === 'pendente';
  });

  // Check for high spending categories
  const highSpendingCategory = expensesByCategory?.find(category => category.percentage > 40);

  // Add alerts
  if (upcomingLoans?.length) {
    alerts.push({
      type: 'warning',
      title: 'Empréstimo Vencendo',
      description: `Empréstimo de ${upcomingLoans[0].borrower} vence em breve.`,
      icon: AlertTriangle,
    });
  }

  if (upcomingDebts?.length) {
    alerts.push({
      type: 'error',
      title: 'Vencimento de Dívida',
      description: `Dívida com ${upcomingDebts[0].creditor} vence em breve.`,
      icon: XCircle,
    });
  }

  if (highSpendingCategory) {
    alerts.push({
      type: 'warning',
      title: 'Gastos Elevados',
      description: `Você gastou ${highSpendingCategory.percentage.toFixed(1)}% do orçamento em ${highSpendingCategory.category}.`,
      icon: AlertTriangle,
    });
  }

  // Add positive alert if no issues
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Tudo em Ordem',
      description: 'Suas finanças estão organizadas e sem alertas no momento.',
      icon: CheckCircle,
    });
  }

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Alertas e Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <Alert 
              key={index} 
              className={`${
                alert.type === 'error' ? 'border-red-200 bg-red-50' :
                alert.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                'border-green-200 bg-green-50'
              }`}
            >
              <alert.icon className={`h-4 w-4 ${
                alert.type === 'error' ? 'text-red-600' :
                alert.type === 'warning' ? 'text-amber-600' :
                'text-green-600'
              }`} />
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-1">
                  {alert.title}
                </h4>
                <AlertDescription className="text-sm text-slate-600">
                  {alert.description}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
