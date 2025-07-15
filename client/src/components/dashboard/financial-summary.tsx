import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  Banknote, 
  PiggyBank, 
  CreditCard, 
  HandCoins,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import type { FinancialSummary } from "@/lib/types";

export default function FinancialSummary() {
  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/dashboard/financial-summary"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Conta Corrente",
      value: summary?.currentAccountBalance || "0",
      icon: Banknote,
      iconBg: "bg-blue-100",
      iconColor: "text-primary",
      trend: "+2.5% este mês",
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: "Total Poupança",
      value: summary?.totalSavings || "0",
      icon: PiggyBank,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: "+8.2% este mês",
      trendIcon: TrendingUp,
      trendColor: "text-green-600"
    },
    {
      title: "Dívidas Pendentes",
      value: summary?.totalDebts || "0",
      icon: CreditCard,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      trend: "-15.3% este mês",
      trendIcon: TrendingDown,
      trendColor: "text-red-600"
    },
    {
      title: "Empréstimos Dados",
      value: summary?.totalLoans || "0",
      icon: HandCoins,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      trend: "2 empréstimos ativos",
      trendIcon: null,
      trendColor: "text-slate-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                  {formatCurrency(card.value)}
                </p>
                <div className="flex items-center text-sm mt-1">
                  {card.trendIcon && (
                    <card.trendIcon className={`w-4 h-4 mr-1 ${card.trendColor}`} />
                  )}
                  <span className={card.trendColor}>{card.trend}</span>
                </div>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ml-4`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
