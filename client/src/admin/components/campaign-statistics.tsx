import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Users, DollarSign, Ticket, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignStatistics() {
  const { data: statistics, isLoading } = useQuery({
    queryKey: ["/api/admin/campaigns/statistics"],
    throwOnError: false,
  });

  if (isLoading) {
    return <div className="p-6">Carregando estatísticas...</div>;
  }

  if (!statistics) {
    return <div className="p-6">Erro ao carregar estatísticas</div>;
  }

  const stats = [
    {
      title: "Total de Campanhas",
      value: statistics.totalCampaigns,
      icon: Ticket,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Campanhas Ativas",
      value: statistics.activeCampaigns,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Cupons Utilizados",
      value: statistics.totalUsage,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Desconto Total",
      value: `${statistics.totalDiscount.toFixed(2)} Kz`,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Receita com Desconto",
      value: `${statistics.totalRevenue.toFixed(2)} Kz`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Performing Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas com Melhor Performance</CardTitle>
          <CardDescription>
            Campanhas que geraram mais desconto e receita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Desconto Total</TableHead>
                <TableHead>Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.topCampaigns.map((campaign: any) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.couponCode}</Badge>
                  </TableCell>
                  <TableCell>{campaign.usageCount}</TableCell>
                  <TableCell className="text-red-600">
                    -{campaign.totalDiscount.toFixed(2)} Kz
                  </TableCell>
                  <TableCell className="text-green-600">
                    {campaign.totalRevenue.toFixed(2)} Kz
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Campaign Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Uso Recente de Cupons</CardTitle>
          <CardDescription>
            Últimos cupons utilizados pelos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Preço Final</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.recentUsage.map((usage: any) => (
                <TableRow key={usage.id}>
                  <TableCell className="font-medium">{usage.campaignName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{usage.couponCode}</Badge>
                  </TableCell>
                  <TableCell className="text-red-600">
                    -{usage.discountAmount.toFixed(2)} Kz
                  </TableCell>
                  <TableCell className="text-green-600">
                    {usage.finalPrice.toFixed(2)} Kz
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{usage.planType}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(usage.usedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}