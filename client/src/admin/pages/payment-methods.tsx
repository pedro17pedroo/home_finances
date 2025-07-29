import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Settings, Edit, Trash2, CreditCard, Smartphone, Building2, Eye, EyeOff } from "lucide-react";
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
import type { PaymentMethod, InsertPaymentMethod } from "@shared/schema";

export default function PaymentMethodsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [viewingMethod, setViewingMethod] = useState<PaymentMethod | null>(null);
  const { toast } = useToast();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["/api/admin/payment-methods"],
    throwOnError: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPaymentMethod) => {
      const response = await apiRequest("POST", "/api/admin/payment-methods", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); // Public endpoint
      setIsCreateOpen(false);
      toast({ title: "Método de pagamento criado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PaymentMethod> }) => {
      const response = await apiRequest("PATCH", `/api/admin/payment-methods/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); // Public endpoint
      setEditingMethod(null);
      toast({ title: "Método de pagamento atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/payment-methods/${id}`, { isActive });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); // Public endpoint
      toast({ 
        title: `Método ${arguments[0].isActive ? 'ativado' : 'desativado'} com sucesso` 
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
      const response = await apiRequest("DELETE", `/api/admin/payment-methods/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); // Public endpoint
      toast({ title: "Método de pagamento removido com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao remover método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Build config object from individual fields
    const configData: any = {};
    
    // Handle different method types
    const methodType = formData.get("name") as string;
    
    if (methodType === 'bank_transfer') {
      const bankName = formData.get("bankName") as string;
      const accountNumber = formData.get("accountNumber") as string;
      const accountHolder = formData.get("accountHolder") as string;
      const iban = formData.get("iban") as string;
      
      if (bankName && accountNumber) {
        configData.banks = [{
          name: bankName,
          accountNumber,
          accountHolder,
          iban
        }];
      }
    }
    
    // Add custom config if provided
    const customConfig = formData.get("customConfig") as string;
    if (customConfig && customConfig.trim()) {
      try {
        const parsed = JSON.parse(customConfig);
        Object.assign(configData, parsed);
      } catch (error) {
        toast({ title: "Configuração JSON personalizada inválida", variant: "destructive" });
        return;
      }
    }

    createMutation.mutate({
      name: methodType,
      displayName: formData.get("displayName") as string,
      isActive: formData.get("isActive") === "on",
      config: Object.keys(configData).length > 0 ? configData : null,
      instructions: formData.get("instructions") as string || null,
      processingTime: formData.get("processingTime") as string || null,
      fees: formData.get("fees") as string || null,
      displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMethod) return;
    
    const formData = new FormData(e.currentTarget);
    
    // Build config object from individual fields
    const configData: any = {};
    
    // Handle different method types
    const methodType = formData.get("name") as string;
    
    if (methodType === 'bank_transfer') {
      const bankName = formData.get("bankName") as string;
      const accountNumber = formData.get("accountNumber") as string;
      const accountHolder = formData.get("accountHolder") as string;
      const iban = formData.get("iban") as string;
      
      if (bankName && accountNumber) {
        configData.banks = [{
          name: bankName,
          accountNumber,
          accountHolder,
          iban
        }];
      }
    }
    
    // Add custom config if provided
    const customConfig = formData.get("customConfig") as string;
    if (customConfig && customConfig.trim()) {
      try {
        const parsed = JSON.parse(customConfig);
        Object.assign(configData, parsed);
      } catch (error) {
        toast({ title: "Configuração JSON personalizada inválida", variant: "destructive" });
        return;
      }
    }

    updateMutation.mutate({
      id: editingMethod.id,
      data: {
        name: methodType,
        displayName: formData.get("displayName") as string,
        isActive: formData.get("isActive") === "on",
        config: Object.keys(configData).length > 0 ? configData : null,
        instructions: formData.get("instructions") as string || null,
        processingTime: formData.get("processingTime") as string || null,
        fees: formData.get("fees") as string || null,
        displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
      },
    });
  };

  if (isLoading) {
    return <div className="p-6">Carregando métodos de pagamento...</div>;
  }

  return (
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tipo de Método</Label>
                  <Select name="name" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe (Cartão)</SelectItem>
                      <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                      <SelectItem value="multicaixa">Multicaixa Express</SelectItem>
                      <SelectItem value="unitel_money">Unitel Money</SelectItem>
                      <SelectItem value="afrimoney">AfriMoney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  <Input 
                    id="displayName" 
                    name="displayName" 
                    placeholder="Cartão de Crédito/Débito"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayOrder">Ordem de Exibição</Label>
                  <Input 
                    id="displayOrder" 
                    name="displayOrder" 
                    type="number"
                    defaultValue="0"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="processingTime">Tempo de Processamento</Label>
                  <Input 
                    id="processingTime" 
                    name="processingTime" 
                    placeholder="Instantâneo, 1-3 dias úteis"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fees">Taxas</Label>
                <Input 
                  id="fees" 
                  name="fees" 
                  placeholder="Gratuito, 2.9% + 0.30 USD"
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instruções de Pagamento</Label>
                <Textarea 
                  id="instructions" 
                  name="instructions" 
                  placeholder="Instruções detalhadas para o usuário sobre como pagar"
                  rows={3}
                />
              </div>

              {/* Bank Transfer Specific Fields */}
              <div className="space-y-3">
                <Label>Configuração de Transferência Bancária (se aplicável)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bankName">Nome do Banco</Label>
                    <Input 
                      id="bankName" 
                      name="bankName" 
                      placeholder="Banco Angolano de Investimentos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Número da Conta</Label>
                    <Input 
                      id="accountNumber" 
                      name="accountNumber" 
                      placeholder="123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountHolder">Titular da Conta</Label>
                    <Input 
                      id="accountHolder" 
                      name="accountHolder" 
                      placeholder="Finance Control Ltd"
                    />
                  </div>
                  <div>
                    <Label htmlFor="iban">IBAN (se aplicável)</Label>
                    <Input 
                      id="iban" 
                      name="iban" 
                      placeholder="AO06000000001234567891234"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="customConfig">Configuração Personalizada (JSON)</Label>
                <Textarea 
                  id="customConfig" 
                  name="customConfig" 
                  placeholder='{"api_key": "value", "webhook_url": "https://..."}'
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Configurações avançadas em formato JSON (opcional)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" name="isActive" defaultChecked />
                <Label htmlFor="isActive">Método ativo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Método"}
                </Button>
              </div>
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
  );
}