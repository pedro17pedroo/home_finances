import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, DollarSign, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, InsertPlan } from "@shared/schema";

export default function PlansPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/admin/plans"],
    throwOnError: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPlan) => {
      const response = await apiRequest("POST", "/api/admin/plans", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] }); // Public endpoint
      setIsCreateOpen(false);
      toast({ title: "Plano criado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar plano", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Plan> }) => {
      const response = await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] }); // Public endpoint
      setEditingPlan(null);
      toast({ title: "Plano atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar plano", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/plans/${id}`, { isActive });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] }); // Public endpoint
      toast({ 
        title: `Plano ${arguments[0].isActive ? 'ativado' : 'desativado'} com sucesso` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao alterar status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/plans/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] }); // Public endpoint
      toast({ title: "Plano removido com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao remover plano", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Build features object
    const features = {
      maxAccounts: parseInt(formData.get("maxAccounts") as string) || 5,
      maxTransactions: parseInt(formData.get("maxTransactions") as string) || 1000,
      hasReports: formData.get("hasReports") === "on",
      hasExport: formData.get("hasExport") === "on",
      hasGoals: formData.get("hasGoals") === "on",
      hasLoans: formData.get("hasLoans") === "on",
      hasDebts: formData.get("hasDebts") === "on",
      hasPriority: formData.get("hasPriority") === "on",
    };

    createMutation.mutate({
      name: formData.get("name") as string,
      type: formData.get("type") as "basic" | "premium" | "enterprise",
      price: formData.get("price") as string,
      stripePriceId: formData.get("stripePriceId") as string || null,
      features,
      maxAccounts: features.maxAccounts,
      maxTransactions: features.maxTransactions,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlan) return;
    
    const formData = new FormData(e.currentTarget);
    
    // Build features object
    const features = {
      maxAccounts: parseInt(formData.get("maxAccounts") as string) || 5,
      maxTransactions: parseInt(formData.get("maxTransactions") as string) || 1000,
      hasReports: formData.get("hasReports") === "on",
      hasExport: formData.get("hasExport") === "on",
      hasGoals: formData.get("hasGoals") === "on",
      hasLoans: formData.get("hasLoans") === "on",
      hasDebts: formData.get("hasDebts") === "on",
      hasPriority: formData.get("hasPriority") === "on",
    };

    updateMutation.mutate({
      id: editingPlan.id,
      data: {
        name: formData.get("name") as string,
        type: formData.get("type") as "basic" | "premium" | "enterprise",
        price: formData.get("price") as string,
        stripePriceId: formData.get("stripePriceId") as string || null,
        features,
        maxAccounts: features.maxAccounts,
        maxTransactions: features.maxTransactions,
        isActive: formData.get("isActive") === "on",
      },
    });
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toLocaleString() + " Kz";
  };

  const getFeaturesList = (features: any) => {
    if (!features) return [];
    
    const featureNames = [];
    if (features.hasReports) featureNames.push("Relatórios");
    if (features.hasExport) featureNames.push("Exportação");
    if (features.hasGoals) featureNames.push("Metas de Poupança");
    if (features.hasLoans) featureNames.push("Empréstimos");
    if (features.hasDebts) featureNames.push("Dívidas");
    if (features.hasPriority) featureNames.push("Suporte Prioritário");
    
    return featureNames;
  };

  if (isLoading) {
    return <div className="p-6">Carregando planos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Configure planos, preços e integração com Stripe
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Plano</DialogTitle>
              <DialogDescription>
                Configure um novo plano de assinatura
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Plano Básico"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (Kz)</Label>
                  <Input 
                    id="price" 
                    name="price" 
                    type="number"
                    step="0.01"
                    placeholder="14500.00"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="stripePriceId">Stripe Price ID</Label>
                  <Input 
                    id="stripePriceId" 
                    name="stripePriceId" 
                    placeholder="price_xxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ID do preço no Stripe para integração de pagamentos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxAccounts">Máx. Contas</Label>
                  <Input 
                    id="maxAccounts" 
                    name="maxAccounts" 
                    type="number"
                    defaultValue="5"
                  />
                </div>
                <div>
                  <Label htmlFor="maxTransactions">Máx. Transações/Mês</Label>
                  <Input 
                    id="maxTransactions" 
                    name="maxTransactions" 
                    type="number"
                    defaultValue="1000"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Funcionalidades</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasReports" name="hasReports" />
                    <Label htmlFor="hasReports">Relatórios</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasExport" name="hasExport" />
                    <Label htmlFor="hasExport">Exportação</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasGoals" name="hasGoals" />
                    <Label htmlFor="hasGoals">Metas de Poupança</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasLoans" name="hasLoans" />
                    <Label htmlFor="hasLoans">Empréstimos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasDebts" name="hasDebts" />
                    <Label htmlFor="hasDebts">Dívidas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="hasPriority" name="hasPriority" />
                    <Label htmlFor="hasPriority">Suporte Prioritário</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" defaultChecked />
                <Label htmlFor="isActive">Plano ativo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Plano"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan: Plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-blue-600">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-gray-500">/mês</span>
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{plan.type}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`toggle-${plan.id}`}>Status</Label>
                <Switch
                  id={`toggle-${plan.id}`}
                  checked={plan.isActive}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: plan.id, isActive: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Limites</Label>
                <div className="text-sm space-y-1">
                  <div>Contas: {plan.maxAccounts}</div>
                  <div>Transações: {plan.maxTransactions}/mês</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Funcionalidades</Label>
                <div className="flex flex-wrap gap-1">
                  {getFeaturesList(plan.features).map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {plan.stripePriceId && (
                <div className="space-y-2">
                  <Label>Stripe Integration</Label>
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    {plan.stripePriceId}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Dialog open={editingPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingPlan(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Editar Plano</DialogTitle>
                      <DialogDescription>
                        Modifique as configurações do plano
                      </DialogDescription>
                    </DialogHeader>
                    {editingPlan && (
                      <form onSubmit={handleUpdateSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-name">Nome do Plano</Label>
                            <Input 
                              id="edit-name" 
                              name="name" 
                              defaultValue={editingPlan.name}
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-type">Tipo</Label>
                            <Select name="type" defaultValue={editingPlan.type} required>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">Básico</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-price">Preço (Kz)</Label>
                            <Input 
                              id="edit-price" 
                              name="price" 
                              type="number"
                              step="0.01"
                              defaultValue={editingPlan.price}
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-stripePriceId">Stripe Price ID</Label>
                            <Input 
                              id="edit-stripePriceId" 
                              name="stripePriceId" 
                              defaultValue={editingPlan.stripePriceId || ""}
                              placeholder="price_xxxxxxxxxx"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              ID do preço no Stripe para integração de pagamentos
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-maxAccounts">Máx. Contas</Label>
                            <Input 
                              id="edit-maxAccounts" 
                              name="maxAccounts" 
                              type="number"
                              defaultValue={editingPlan.maxAccounts}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-maxTransactions">Máx. Transações/Mês</Label>
                            <Input 
                              id="edit-maxTransactions" 
                              name="maxTransactions" 
                              type="number"
                              defaultValue={editingPlan.maxTransactions}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Funcionalidades</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasReports" name="hasReports" 
                                defaultChecked={editingPlan.features?.hasReports} />
                              <Label htmlFor="edit-hasReports">Relatórios</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasExport" name="hasExport" 
                                defaultChecked={editingPlan.features?.hasExport} />
                              <Label htmlFor="edit-hasExport">Exportação</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasGoals" name="hasGoals" 
                                defaultChecked={editingPlan.features?.hasGoals} />
                              <Label htmlFor="edit-hasGoals">Metas de Poupança</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasLoans" name="hasLoans" 
                                defaultChecked={editingPlan.features?.hasLoans} />
                              <Label htmlFor="edit-hasLoans">Empréstimos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasDebts" name="hasDebts" 
                                defaultChecked={editingPlan.features?.hasDebts} />
                              <Label htmlFor="edit-hasDebts">Dívidas</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="edit-hasPriority" name="hasPriority" 
                                defaultChecked={editingPlan.features?.hasPriority} />
                              <Label htmlFor="edit-hasPriority">Suporte Prioritário</Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="edit-isActive" name="isActive" 
                            defaultChecked={editingPlan.isActive} />
                          <Label htmlFor="edit-isActive">Plano ativo</Label>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja remover este plano?")) {
                      deleteMutation.mutate(plan.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}