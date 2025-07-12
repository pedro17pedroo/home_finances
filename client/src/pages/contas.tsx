import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, CreditCard, Wallet, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccountSchema, type Account, type InsertAccount } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AccountLimitGuard from "@/components/auth/account-limit-guard";

const accountTypeIcons = {
  corrente: CreditCard,
  poupanca: PiggyBank,
};

const accountTypeLabels = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
};

export default function Contas() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { toast } = useToast();

  // Buscar contas
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Criar conta
  const createMutation = useMutation({
    mutationFn: (data: InsertAccount) => {
      console.log("Mutation called with data:", data);
      return apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      console.log("Account created successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Conta criada",
        description: "A conta foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating account:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta.",
        variant: "destructive",
      });
    },
  });

  // Atualizar conta
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertAccount> }) => 
      apiRequest("PATCH", `/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditingAccount(null);
      toast({
        title: "Conta atualizada",
        description: "A conta foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar conta.",
        variant: "destructive",
      });
    },
  });

  // Deletar conta
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] });
      toast({
        title: "Conta removida",
        description: "A conta foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover conta.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertAccount>({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      name: "",
      type: "corrente",
      bank: "",
      balance: "0",
      interestRate: "0",
    },
  });

  const editForm = useForm<InsertAccount>({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      name: "",
      type: "corrente",
      bank: "",
      balance: "0",
      interestRate: "0",
    },
  });

  const onSubmit = (data: InsertAccount) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertAccount) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    }
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    editForm.reset({
      name: account.name,
      type: account.type,
      bank: account.bank,
      balance: account.balance,
      interestRate: account.interestRate || "0",
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover esta conta?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Contas Bancárias</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e carteiras
          </p>
        </div>

        <AccountLimitGuard>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Conta</DialogTitle>
                <DialogDescription>
                  Adicione uma nova conta bancária ao seu controle financeiro.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={(e) => {
                  console.log("Form onSubmit event triggered");
                  console.log("Form is valid:", form.formState.isValid);
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form values:", form.getValues());
                  form.handleSubmit(onSubmit)(e);
                }} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Conta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: BAI - CC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BAI">Banco Angolano de Investimentos (BAI)</SelectItem>
                            <SelectItem value="BFA">Banco de Fomento Angola (BFA)</SelectItem>
                            <SelectItem value="BIC">Banco BIC</SelectItem>
                            <SelectItem value="Millennium">Millennium Atlântico</SelectItem>
                            <SelectItem value="Standard Bank">Standard Bank</SelectItem>
                            <SelectItem value="BPC">Banco de Poupança e Crédito (BPC)</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo Inicial</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa de Juros (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      onClick={() => console.log("Submit button clicked")}
                    >
                      {createMutation.isPending ? "Criando..." : "Criar Conta"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </AccountLimitGuard>
      </div>

      {/* Lista de Contas */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando sua primeira conta bancária para controlar suas finanças.
            </p>
            <AccountLimitGuard>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Conta
              </Button>
            </AccountLimitGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const IconComponent = accountTypeIcons[account.type as keyof typeof accountTypeIcons];
            const typeLabel = accountTypeLabels[account.type as keyof typeof accountTypeLabels];
            
            return (
              <Card key={account.id} className="group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <CardDescription>{typeLabel}</CardDescription>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(account)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(parseFloat(account.balance))}
                  </div>
                  {account.interestRate && parseFloat(account.interestRate) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Taxa: {account.interestRate}% a.a.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Edição */}
      <Dialog open={editingAccount !== null} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Atualize as informações da sua conta bancária.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Conta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BAI - CC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BAI">Banco Angolano de Investimentos (BAI)</SelectItem>
                        <SelectItem value="BFA">Banco de Fomento Angola (BFA)</SelectItem>
                        <SelectItem value="BIC">Banco BIC</SelectItem>
                        <SelectItem value="Millennium">Millennium Atlântico</SelectItem>
                        <SelectItem value="Standard Bank">Standard Bank</SelectItem>
                        <SelectItem value="BPC">Banco de Poupança e Crédito (BPC)</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Atual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Juros (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAccount(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}