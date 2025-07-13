import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccountSchema, type Account, type InsertAccount } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AccountLimitGuard from "@/components/auth/account-limit-guard";

export default function AccountManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });

  // Debug logging
  console.log("Dashboard account-management - accounts data:", accounts);
  console.log("Dashboard account-management - isLoading:", isLoading);

  // Criar conta
  const createMutation = useMutation({
    mutationFn: (data: InsertAccount) => apiRequest("POST", "/api/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Conta criada",
        description: "A conta foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertAccount>({
    resolver: zodResolver(insertAccountSchema.omit({ userId: true })),
    defaultValues: {
      name: "",
      type: "corrente",
      bank: "",
      balance: "0",
      interestRate: "0",
    },
  });

  const onSubmit = (data: InsertAccount) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Contas e Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Contas e Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts?.map((account) => (
              <div key={account.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-900">{account.bank}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    account.type === 'poupanca' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {account.type === 'poupanca' ? 'Poupança' : 'Corrente'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {formatCurrency(account.balance)}
                </p>
                {account.interestRate && (
                  <p className="text-sm text-slate-500 mb-3">
                    Taxa: {account.interestRate}% a.m.
                  </p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-600">
                    {account.type === 'poupanca' ? 'Rendimento mensal' : 'Disponível'}
                  </span>
                  <Button variant="ghost" size="sm" asChild className="text-primary hover:text-blue-700">
                    <Link href="/contas">
                      <Edit className="w-4 h-4 mr-1" />
                      Atualizar
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <div className="flex items-center justify-center h-24">
                <AccountLimitGuard>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex flex-col items-center text-slate-500 hover:text-slate-700"
                  >
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Adicionar Conta</span>
                  </Button>
                </AccountLimitGuard>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criação de Conta */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Conta</DialogTitle>
            <DialogDescription>
              Adicione uma nova conta bancária ao seu controle financeiro.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                >
                  {createMutation.isPending ? "Criando..." : "Criar Conta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
