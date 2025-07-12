import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateInput } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";
import type { Account } from "@shared/schema";

const transactionFormSchema = z.object({
  amount: z.string().min(1, "Valor é obrigatório"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  type: z.enum(["receita", "despesa"]),
  accountId: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  defaultType?: "receita" | "despesa";
  onSuccess?: () => void;
}

export default function TransactionForm({ defaultType = "receita", onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: defaultType,
      date: formatDateInput(new Date()),
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        accountId: data.accountId ? parseInt(data.accountId) : undefined,
        date: new Date(data.date),
      };
      return await apiRequest("POST", "/api/transactions", payload);
    },
    onSuccess: () => {
      toast({
        title: "Transação criada",
        description: "A transação foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  const watchedType = form.watch("type");
  const availableCategories = CATEGORIES[watchedType] || [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="type">Tipo</Label>
        <Select onValueChange={(value) => form.setValue("type", value as "receita" | "despesa")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Valor</Label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-500">R$</span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            className="pl-8"
            placeholder="0,00"
            {...form.register("amount")}
          />
        </div>
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select onValueChange={(value) => form.setValue("category", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.category && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.category.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="accountId">Conta</Label>
        <Select onValueChange={(value) => form.setValue("accountId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a conta (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.bank} - {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.date.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Opcional"
          {...form.register("description")}
        />
      </div>

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={() => form.reset()}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-primary hover:bg-blue-700"
          disabled={createTransactionMutation.isPending}
        >
          {createTransactionMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
