import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { useCacheSync } from "@/hooks/use-cache-sync";
import type { Account } from "@shared/schema";

const debtFormSchema = z.object({
  amount: z.string().min(1, "Valor é obrigatório"),
  creditor: z.string().min(1, "Nome do credor é obrigatório"),
  accountId: z.string().min(1, "Conta é obrigatória"),
  interestRate: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

type DebtFormData = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  onSuccess?: () => void;
}

export default function DebtForm({ onSuccess }: DebtFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncDebts } = useCacheSync();

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const form = useForm<DebtFormData>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {},
  });

  const createDebtMutation = useMutation({
    mutationFn: async (data: DebtFormData) => {
      const payload = {
        ...data,
        accountId: parseInt(data.accountId),
        amount: data.amount, // Keep as string for Drizzle decimal type
        interestRate: data.interestRate || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: "pendente", // Always create as pending
      };
      return await apiRequest("POST", "/api/debts", payload);
    },
    onSuccess: async () => {
      toast({
        title: "Dívida criada",
        description: "A dívida foi registrada com sucesso.",
      });
      await syncDebts();
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar dívida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DebtFormData) => {
    createDebtMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="creditor">Nome do Credor</Label>
        <Input
          id="creditor"
          placeholder="Ex: BAI"
          {...form.register("creditor")}
        />
        {form.formState.errors.creditor && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.creditor.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Valor</Label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-500">Kz</span>
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
        <Label htmlFor="interestRate">Taxa de Juros (% opcional)</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.01"
          placeholder="0,00"
          {...form.register("interestRate")}
        />
      </div>

      <div>
        <Label htmlFor="dueDate">Data de Vencimento (opcional)</Label>
        <Input
          id="dueDate"
          type="date"
          {...form.register("dueDate")}
        />
      </div>

      <div>
        <Label htmlFor="accountId">Conta que será movimentada</Label>
        <Select onValueChange={(value) => form.setValue("accountId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma conta" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.name} ({account.bank})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.accountId && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.accountId.message}</p>
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
          className="flex-1 bg-red-600 hover:bg-red-700"
          disabled={createDebtMutation.isPending}
        >
          {createDebtMutation.isPending ? "Salvando..." : "Criar Dívida"}
        </Button>
      </div>
    </form>
  );
}
