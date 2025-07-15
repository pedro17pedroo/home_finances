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
import type { Account } from "@shared/schema";

const loanFormSchema = z.object({
  amount: z.string().min(1, "Valor é obrigatório"),
  borrower: z.string().min(1, "Nome do devedor é obrigatório"),
  accountId: z.string().min(1, "Conta é obrigatória"),
  interestRate: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

interface LoanFormProps {
  onSuccess?: () => void;
}

export default function LoanForm({ onSuccess }: LoanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {},
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: LoanFormData) => {
      const payload = {
        ...data,
        accountId: parseInt(data.accountId),
        amount: data.amount, // Keep as string for Drizzle decimal type
        interestRate: data.interestRate || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: "pendente", // Always create as pending
      };
      return await apiRequest("POST", "/api/loans", payload);
    },
    onSuccess: () => {
      toast({
        title: "Empréstimo criado",
        description: "O empréstimo foi registrado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar empréstimo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoanFormData) => {
    createLoanMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="borrower">Nome do Devedor</Label>
        <Input
          id="borrower"
          placeholder="Ex: João Silva"
          {...form.register("borrower")}
        />
        {form.formState.errors.borrower && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.borrower.message}</p>
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
          className="flex-1 bg-amber-600 hover:bg-amber-700"
          disabled={createLoanMutation.isPending}
        >
          {createLoanMutation.isPending ? "Salvando..." : "Criar Empréstimo"}
        </Button>
      </div>
    </form>
  );
}
