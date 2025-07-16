import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Settings, Toggle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "../components/layout/admin-layout";
import type { PaymentMethod, InsertPaymentMethod } from "@shared/schema";

export default function PaymentMethodsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["/api/admin/payment-methods"],
    throwOnError: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertPaymentMethod) =>
      apiRequest("/api/admin/payment-methods", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      setIsCreateOpen(false);
      toast({ title: "Método de pagamento criado com sucesso" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentMethod> }) =>
      apiRequest(`/api/admin/payment-methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      setEditingMethod(null);
      toast({ title: "Método de pagamento atualizado com sucesso" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/admin/payment-methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const config = formData.get("config") as string;
    let parsedConfig = {};
    
    if (config.trim()) {
      try {
        parsedConfig = JSON.parse(config);
      } catch (error) {
        toast({ title: "Configuração JSON inválida", variant: "destructive" });
        return;
      }
    }

    createMutation.mutate({
      name: formData.get("name") as string,
      displayName: formData.get("displayName") as string,
      isActive: formData.get("isActive") === "on",
      config: parsedConfig,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMethod) return;
    
    const formData = new FormData(e.currentTarget);
    const config = formData.get("config") as string;
    let parsedConfig = {};
    
    if (config.trim()) {
      try {
        parsedConfig = JSON.parse(config);
      } catch (error) {
        toast({ title: "Configuração JSON inválida", variant: "destructive" });
        return;
      }
    }

    updateMutation.mutate({
      id: editingMethod.id,
      data: {
        name: formData.get("name") as string,
        displayName: formData.get("displayName") as string,
        isActive: formData.get("isActive") === "on",
        config: parsedConfig,
      },
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">Carregando métodos de pagamento...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métodos de Pagamento</h1>
          <p className="text-muted-foreground">
            Configure e gerencie os métodos de pagamento disponíveis
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Método
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Método de Pagamento</DialogTitle>
              <DialogDescription>
                Configure um novo método de pagamento para o sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Sistema</Label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="stripe, paypal, bank_transfer"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input 
                  id="displayName" 
                  name="displayName" 
                  required 
                  placeholder="Cartão de Crédito/Débito"
                />
              </div>
              <div>
                <Label htmlFor="config">Configuração (JSON)</Label>
                <Textarea 
                  id="config" 
                  name="config" 
                  placeholder='{"apiKey": "sk_...", "webhookSecret": "whsec_..."}'
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" defaultChecked />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Método"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paymentMethods?.map((method: PaymentMethod) => (
          <Card key={method.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{method.displayName}</CardTitle>
                  <CardDescription>{method.name}</CardDescription>
                </div>
                <Badge variant={method.isActive ? "default" : "secondary"}>
                  {method.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`toggle-${method.id}`}>Status</Label>
                <Switch
                  id={`toggle-${method.id}`}
                  checked={method.isActive}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: method.id, isActive: checked })
                  }
                />
              </div>
              
              {method.config && typeof method.config === 'object' && (
                <div className="space-y-2">
                  <Label>Configurações</Label>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {Object.keys(method.config as object).length} configuração(ões)
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Dialog 
                  open={editingMethod?.id === method.id} 
                  onOpenChange={(open) => setEditingMethod(open ? method : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configurar {method.displayName}</DialogTitle>
                      <DialogDescription>
                        Edite as configurações do método de pagamento
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Nome do Sistema</Label>
                        <Input 
                          id="edit-name" 
                          name="name" 
                          required 
                          defaultValue={method.name}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-displayName">Nome de Exibição</Label>
                        <Input 
                          id="edit-displayName" 
                          name="displayName" 
                          required 
                          defaultValue={method.displayName}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-config">Configuração (JSON)</Label>
                        <Textarea 
                          id="edit-config" 
                          name="config" 
                          defaultValue={method.config ? JSON.stringify(method.config, null, 2) : ""}
                          rows={6}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="edit-isActive" 
                          name="isActive" 
                          defaultChecked={method.isActive}
                        />
                        <Label htmlFor="edit-isActive">Ativo</Label>
                      </div>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Atualizando..." : "Atualizar"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {paymentMethods?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum método de pagamento configurado ainda.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </AdminLayout>
  );
}