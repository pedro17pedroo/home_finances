import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateInput } from "@/lib/utils";

const savingsGoalFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  targetAmount: z.string().min(1, "Valor meta é obrigatório"),
  currentAmount: z.string().optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
});

type SavingsGoalFormData = z.infer<typeof savingsGoalFormSchema>;

interface SavingsGoalFormProps {
  onSuccess?: () => void;
}

export default function SavingsGoalForm({ onSuccess }: SavingsGoalFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalFormSchema),
    defaultValues: {
      currentAmount: "0",
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: SavingsGoalFormData) => {
      const payload = {
        ...data,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || "0",
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      };
      return await apiRequest("POST", "/api/savings-goals", payload);
    },
    onSuccess: () => {
      toast({
        title: "Meta criada",
        description: "A meta de poupança foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SavingsGoalFormData) => {
    createGoalMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Meta</Label>
        <Input
          id="name"
          placeholder="Ex: Viagem de férias"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="targetAmount">Valor Meta</Label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-500">Kz</span>
          <Input
            id="targetAmount"
            type="number"
            step="0.01"
            className="pl-8"
            placeholder="0,00"
            {...form.register("targetAmount")}
          />
        </div>
        {form.formState.errors.targetAmount && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.targetAmount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="currentAmount">Valor Atual</Label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-500">Kz</span>
          <Input
            id="currentAmount"
            type="number"
            step="0.01"
            className="pl-8"
            placeholder="0,00"
            {...form.register("currentAmount")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="targetDate">Data Meta (opcional)</Label>
        <Input
          id="targetDate"
          type="date"
          {...form.register("targetDate")}
        />
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
          disabled={createGoalMutation.isPending}
        >
          {createGoalMutation.isPending ? "Salvando..." : "Criar Meta"}
        </Button>
      </div>
    </form>
  );
}
