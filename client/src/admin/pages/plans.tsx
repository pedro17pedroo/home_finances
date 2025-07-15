import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, DollarSign, Settings, Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: number;
  name: string;
  type: string;
  price: string;
  stripePriceId: string;
  features: any;
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
  createdAt: string;
}

// Available features for plans
const AVAILABLE_FEATURES = {
  dashboard: 'Dashboard Completo',
  transactions: 'Gestão de Transações',
  accounts: 'Múltiplas Contas',
  savingsGoals: 'Objetivos de Poupança',
  loans: 'Gestão de Empréstimos',
  debts: 'Gestão de Dívidas',
  reports: 'Relatórios Detalhados',
  analytics: 'Análise Avançada',
  teamManagement: 'Gestão de Equipe',
  apiAccess: 'Acesso à API',
  prioritySupport: 'Suporte Prioritário',
  customization: 'Personalização Avançada',
  backup: 'Backup Automático',
  sso: 'Single Sign-On',
  whiteLabel: 'Marca Branca'
};

const planSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['basic', 'premium', 'enterprise']),
  price: z.string().min(1, 'Preço é obrigatório'),
  stripePriceId: z.string().optional(),
  description: z.string().optional(),
  maxAccounts: z.number().min(1, 'Máximo de contas deve ser maior que 0'),
  maxTransactions: z.number().min(1, 'Máximo de transações deve ser maior que 0'),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).default([]),
  customFeatures: z.array(z.string()).default([]),
});

type PlanForm = z.infer<typeof planSchema>;

export default function AdminPlans() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['/api/admin/plans'],
  });

  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      type: 'basic',
      price: '',
      stripePriceId: '',
      description: '',
      maxAccounts: 5,
      maxTransactions: 1000,
      isActive: true,
      features: [],
      customFeatures: [],
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: PlanForm) => {
      // Convert features array to the expected format
      const featuresObject = [...data.features, ...data.customFeatures].reduce((acc, feature) => {
        acc[feature] = true;
        return acc;
      }, {} as Record<string, boolean>);

      return apiRequest('POST', '/api/admin/plans', {
        ...data,
        features: featuresObject,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({ title: 'Plano criado com sucesso' });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlanForm }) => {
      // Convert features array to the expected format
      const featuresObject = [...data.features, ...data.customFeatures].reduce((acc, feature) => {
        acc[feature] = true;
        return acc;
      }, {} as Record<string, boolean>);

      return apiRequest('PUT', `/api/admin/plans/${id}`, {
        ...data,
        features: featuresObject,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({ title: 'Plano atualizado com sucesso' });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({ title: 'Plano excluído com sucesso' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PlanForm) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    
    // Extract features from the plan's features object
    const planFeatures = plan.features || {};
    const selectedFeatures = Object.keys(planFeatures).filter(key => planFeatures[key]);
    const predefinedFeatures = selectedFeatures.filter(feature => Object.keys(AVAILABLE_FEATURES).includes(feature));
    const customFeatures = selectedFeatures.filter(feature => !Object.keys(AVAILABLE_FEATURES).includes(feature));
    
    form.setValue('name', plan.name);
    form.setValue('type', plan.type as 'basic' | 'premium' | 'enterprise');
    form.setValue('price', plan.price);
    form.setValue('stripePriceId', plan.stripePriceId || '');
    form.setValue('description', '');
    form.setValue('maxAccounts', plan.maxAccounts);
    form.setValue('maxTransactions', plan.maxTransactions);
    form.setValue('isActive', plan.isActive);
    form.setValue('features', predefinedFeatures);
    form.setValue('customFeatures', customFeatures);
    
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const addCustomFeature = () => {
    if (customFeatureInput.trim()) {
      const currentFeatures = form.getValues('customFeatures');
      form.setValue('customFeatures', [...currentFeatures, customFeatureInput.trim()]);
      setCustomFeatureInput('');
    }
  };

  const removeCustomFeature = (index: number) => {
    const currentFeatures = form.getValues('customFeatures');
    form.setValue('customFeatures', currentFeatures.filter((_, i) => i !== index));
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      deletePlanMutation.mutate(id);
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'basic':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'premium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'enterprise':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestão de Planos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gerir planos de subscrição e preços - Planos ilimitados disponíveis
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Plano
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Plano</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Plano Premium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Plano</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basic">Básico</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Mensal (Kz)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stripePriceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Price ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="price_1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descrição do plano..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxAccounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Contas</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxTransactions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Transações/Mês</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Features Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Funcionalidades</h3>
                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione as funcionalidades incluídas</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(AVAILABLE_FEATURES).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox
                                id={key}
                                checked={field.value.includes(key)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, key]);
                                  } else {
                                    field.onChange(field.value.filter((item) => item !== key));
                                  }
                                }}
                              />
                              <label htmlFor={key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Custom Features */}
                <FormField
                  control={form.control}
                  name="customFeatures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funcionalidades Personalizadas</FormLabel>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite uma funcionalidade personalizada"
                            value={customFeatureInput}
                            onChange={(e) => setCustomFeatureInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())}
                          />
                          <Button type="button" variant="outline" onClick={addCustomFeature}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {feature}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => removeCustomFeature(index)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Plano Ativo</FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingPlan(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
                    {editingPlan ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Planos ({plans?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Contas</TableHead>
                    <TableHead>Transações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans?.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge className={getPlanTypeColor(plan.type)}>
                          {plan.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {plan.price} Kz
                      </TableCell>
                      <TableCell>{plan.maxAccounts}</TableCell>
                      <TableCell>{plan.maxTransactions}</TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}