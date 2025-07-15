import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/types";
import type { MonthlyTransactionsSummary, ExpensesByCategory } from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Charts() {
  const { data: monthlyData } = useQuery<MonthlyTransactionsSummary[]>({
    queryKey: ["/api/dashboard/monthly-transactions"],
  });

  const { data: expenseData } = useQuery<ExpensesByCategory[]>({
    queryKey: ["/api/dashboard/expenses-by-category"],
  });

  const incomeExpenseData = {
    labels: monthlyData?.map(item => getMonthName(item.month)) || [],
    datasets: [
      {
        label: 'Receitas',
        data: monthlyData?.map(item => parseFloat(item.income)) || [],
        backgroundColor: '#10B981',
        borderRadius: 6,
      },
      {
        label: 'Despesas',
        data: monthlyData?.map(item => parseFloat(item.expenses)) || [],
        backgroundColor: '#EF4444',
        borderRadius: 6,
      }
    ]
  };

  const expenseDistributionData = {
    labels: expenseData?.map(item => item.category) || [],
    datasets: [{
      data: expenseData?.map(item => parseFloat(item.amount)) || [],
      backgroundColor: [
        '#10B981', // Verde
        '#F59E0B', // Amarelo
        '#EF4444', // Vermelho
        '#8B5CF6', // Roxo
        '#06B6D4', // Ciano
        '#84CC16', // Lima
        '#F97316', // Laranja
        '#EC4899', // Rosa
        '#14B8A6', // Teal
        '#F472B6', // Pink
        '#6366F1', // Indigo
        '#EAB308', // Amber
      ],
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y || context.parsed)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${formatCurrency(context.parsed)}`;
          }
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <Card className="border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Receitas vs Despesas
            </CardTitle>
            <Select defaultValue="6months">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="lastyear">Ano passado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={incomeExpenseData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Distribuição de Gastos
            </CardTitle>
            <Select defaultValue="thismonth">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thismonth">Este mês</SelectItem>
                <SelectItem value="lastmonth">Mês passado</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Doughnut data={expenseDistributionData} options={doughnutOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
