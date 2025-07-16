import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SystemSetting, InsertSystemSetting } from "@shared/schema";

const CATEGORIES = [
  { value: "trial", label: "Período de Teste", description: "Configurações relacionadas ao trial gratuito" },
  { value: "payments", label: "Pagamentos", description: "Configurações de processamento de pagamentos" },
  { value: "notifications", label: "Notificações", description: "Configurações de envio de notificações" },
  { value: "security", label: "Segurança", description: "Configurações de segurança do sistema" },
  { value: "features", label: "Funcionalidades", description: "Configurações de funcionalidades do sistema" },
  { value: "integrations", label: "Integrações", description: "Configurações de integrações externas" },
];

const COMMON_SETTINGS = [
  {
    key: "trial_duration_days",
    category: "trial",
    description: "Duração do período de teste em dias",
    defaultValue: 14,
  },
  {
    key: "max_free_accounts",
    category: "trial",
    description: "Número máximo de contas no plano gratuito",
    defaultValue: 3,
  },
  {
    key: "stripe_webhook_endpoint",
    category: "payments",
    description: "URL do webhook do Stripe",
    defaultValue: "/api/webhooks/stripe",
  },
  {
    key: "email_notifications_enabled",
    category: "notifications",
    description: "Habilitar notificações por email",
    defaultValue: true,
  },
  {
    key: "session_timeout_minutes",
    category: "security",
    description: "Timeout da sessão em minutos",
    defaultValue: 60,
  },
];

export default function SystemSettingsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/system-settings"],
    throwOnError: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSystemSetting) =>
      apiRequest("/api/admin/system-settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      setIsCreateOpen(false);
      toast({ title: "Configuração criada com sucesso" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SystemSetting> }) =>
      apiRequest(`/api/admin/system-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      setEditingSetting(null);
      toast({ title: "Configuração atualizada com sucesso" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/system-settings/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      toast({ title: "Configuração removida com sucesso" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const valueText = formData.get("value") as string;
    let parsedValue: any;
    
    try {
      // Try to parse as JSON first
      parsedValue = JSON.parse(valueText);
    } catch {
      // If it fails, treat as string
      parsedValue = valueText;
    }

    const data = {
      key: formData.get("key") as string,
      value: parsedValue,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
    };

    if (isEdit && editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || { label: category, description: "" };
  };

  const filteredSettings = settings?.filter((setting: SystemSetting) => 
    selectedCategory === "all" || setting.category === selectedCategory
  );

  const SettingForm = ({ setting, onSubmit, isPending }: { 
    setting?: SystemSetting; 
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isPending: boolean;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="key">Chave da Configuração</Label>
        <Input 
          id="key" 
          name="key" 
          required 
          defaultValue={setting?.key}
          placeholder="trial_duration_days"
          disabled={!!setting} // Não permitir editar a chave
        />
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select name="category" defaultValue={setting?.category || "trial"}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="value">Valor (JSON ou texto)</Label>
        <Textarea 
          id="value" 
          name="value" 
          required
          rows={4}
          defaultValue={setting ? formatValue(setting.value) : ""}
          placeholder={'14 ou {"enabled": true, "limit": 100}'}
        />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea 
          id="description" 
          name="description" 
          defaultValue={setting?.description || ""}
          placeholder="Descrição da configuração"
          rows={2}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : setting ? "Atualizar" : "Criar Configuração"}
      </Button>
    </form>
  );

  const QuickSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configurações Rápidas</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {COMMON_SETTINGS.map((commonSetting) => {
          const existingSetting = settings?.find((s: SystemSetting) => s.key === commonSetting.key);
          
          return (
            <Card key={commonSetting.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{commonSetting.key}</CardTitle>
                <CardDescription>{commonSetting.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {existingSetting ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Valor atual:</strong> {formatValue(existingSetting.value)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingSetting(existingSetting)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      createMutation.mutate({
                        key: commonSetting.key,
                        category: commonSetting.category,
                        description: commonSetting.description,
                        value: commonSetting.defaultValue,
                      });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar com valor padrão
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-6">Carregando configurações...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações globais do sistema
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Configuração</DialogTitle>
              <DialogDescription>
                Adicione uma nova configuração ao sistema
              </DialogDescription>
            </DialogHeader>
            <SettingForm 
              onSubmit={(e) => handleSubmit(e, false)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="quick">Configurações Rápidas</TabsTrigger>
          {CATEGORIES.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="quick">
          <QuickSettings />
        </TabsContent>
        
        <TabsContent value={selectedCategory} className={selectedCategory === "quick" ? "hidden" : ""}>
          <div className="grid gap-4">
            {filteredSettings?.map((setting: SystemSetting) => (
              <Card key={setting.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-mono">{setting.key}</CardTitle>
                      <CardDescription>{setting.description}</CardDescription>
                    </div>
                    <Badge variant="outline">
                      {getCategoryInfo(setting.category || "").label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Valor atual</Label>
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      {formatValue(setting.value)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingSetting(setting)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(setting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSettings?.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma configuração encontrada nesta categoria.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog 
        open={editingSetting !== null} 
        onOpenChange={(open) => setEditingSetting(open ? editingSetting : null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
            <DialogDescription>
              Atualize o valor da configuração {editingSetting?.key}
            </DialogDescription>
          </DialogHeader>
          {editingSetting && (
            <SettingForm 
              setting={editingSetting}
              onSubmit={(e) => handleSubmit(e, true)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}