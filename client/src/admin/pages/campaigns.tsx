import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Percent, DollarSign, Gift, MoreHorizontal, Edit, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Campaign, InsertCampaign } from "@shared/schema";
import CampaignStatistics from "@/admin/components/campaign-statistics";

export default function CampaignsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    throwOnError: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCampaign) =>
      apiRequest("POST", "/api/admin/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      setIsCreateOpen(false);
      toast({ title: "Campanha criada com sucesso" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Campaign> }) =>
      apiRequest("PATCH", `/api/admin/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      setEditingCampaign(null);
      toast({ title: "Campanha atualizada com sucesso" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Campanha removida com sucesso" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      discountType: formData.get("discountType") as string,
      discountValue: parseFloat(formData.get("discountValue") as string),
      couponCode: formData.get("couponCode") as string,
      validFrom: formData.get("validFrom") ? new Date(formData.get("validFrom") as string) : null,
      validUntil: formData.get("validUntil") ? new Date(formData.get("validUntil") as string) : null,
      usageLimit: formData.get("usageLimit") ? parseInt(formData.get("usageLimit") as string) : null,
      isActive: formData.get("isActive") === "on",
    };

    if (isEdit && editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatDiscount = (campaign: Campaign) => {
    if (campaign.discountType === "percentage") {
      return `${campaign.discountValue}% de desconto`;
    } else {
      return `${campaign.discountValue} Kz de desconto`;
    }
  };

  const isExpired = (campaign: Campaign) => {
    return campaign.validUntil && new Date(campaign.validUntil) < new Date();
  };

  const getDiscountIcon = (discountType: string) => {
    if (discountType === "percentage") {
      return <Percent className="h-4 w-4" />;
    } else {
      return <DollarSign className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie campanhas promocionais e cupons de desconto</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
              <DialogDescription>
                Crie uma nova campanha promocional
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="couponCode">Código do Cupom</Label>
                  <Input id="couponCode" name="couponCode" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">Tipo de Desconto</Label>
                  <Select name="discountType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual</SelectItem>
                      <SelectItem value="fixed">Valor Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">Valor do Desconto</Label>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Válido De</Label>
                  <Input
                    id="validFrom"
                    name="validFrom"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido Até</Label>
                  <Input
                    id="validUntil"
                    name="validUntil"
                    type="datetime-local"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Limite de Uso</Label>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  placeholder="Deixe em branco para ilimitado"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Campanha"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns?.map((campaign: Campaign) => (
              <Card key={campaign.id} className={isExpired(campaign) ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      {getDiscountIcon(campaign.discountType)}
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription>{formatDiscount(campaign)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isExpired(campaign) && (
                        <Badge variant="destructive">Expirado</Badge>
                      )}
                      <Badge variant={campaign.isActive ? "default" : "secondary"}>
                        {campaign.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setEditingCampaign(campaign)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(campaign.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  )}
                  
                  {campaign.couponCode && (
                    <div className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{campaign.couponCode}</span>
                      <Badge variant="outline">Cupom</Badge>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {campaign.usageCount !== undefined && campaign.usageLimit && (
                      <div>
                        <span className="text-muted-foreground">Usos:</span>
                        <span className="ml-1 font-medium">
                          {campaign.usageCount}/{campaign.usageLimit}
                        </span>
                      </div>
                    )}
                    {campaign.validFrom && (
                      <div>
                        <span className="text-muted-foreground">De:</span>
                        <span className="ml-1 font-medium">
                          {format(new Date(campaign.validFrom), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {campaign.validUntil && (
                      <div>
                        <span className="text-muted-foreground">Até:</span>
                        <span className="ml-1 font-medium">
                          {format(new Date(campaign.validUntil), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {campaigns?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="statistics">
          <CampaignStatistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}