import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { recurringTransactionsApi, CreateRecurringTransactionData } from '../../../shared/api/recurring-transactions';
import { accountsApi } from '../../../shared/api/accounts';
import { getCategories, Category } from '../../../shared/api/categories';
import type { Account } from '../../../shared/types';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';

const schema = z.object({
  type: z.enum(['receita', 'despesa']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  categoryId: z.number().positive('Categoria é obrigatória'),
  accountId: z.number().positive('Conta é obrigatória'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().min(1).default(1),
  dayOfWeek: z.union([z.number().min(0).max(6), z.string()]).optional().nullable(),
  dayOfMonth: z.union([z.number().min(1).max(31), z.string()]).optional().nullable(),
  monthOfYear: z.union([z.number().min(1).max(12), z.string()]).optional().nullable(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
  maxOccurrences: z.union([z.number().positive(), z.string(), z.null()]).optional(),
  notifyBeforeDays: z.number().min(0).default(1),
  notificationChannels: z.array(z.enum(['app', 'email', 'sms'])).min(1, 'Selecione pelo menos um canal'),
});

type FormData = z.infer<typeof schema>;

export function RecurringTransactionFormPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/transactions/recurring/:id/edit');
  const id = params?.id;
  const isEditing = !!id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'despesa',
      frequency: 'monthly',
      interval: 1,
      notifyBeforeDays: 1,
      notificationChannels: ['app'],
    },
  });

  const type = watch('type');
  const frequency = watch('frequency');
  const notificationChannels = watch('notificationChannels');

  useEffect(() => {
    loadData();
  }, []);

  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      // Format as YYYY-MM-DD for input[type="date"]
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const loadData = async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountsApi.getAccounts(),
        getCategories(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      if (isEditing && id) {
        const transaction = await recurringTransactionsApi.getById(parseInt(id));
        
        console.log('Loaded transaction:', transaction); // Debug
        
        setValue('type', transaction.type);
        setValue('description', transaction.description);
        setValue('amount', parseFloat(transaction.amount));
        setValue('categoryId', transaction.categoryId || 0);
        setValue('accountId', transaction.accountId);
        setValue('frequency', transaction.frequency);
        setValue('interval', transaction.interval);
        setValue('dayOfWeek', transaction.dayOfWeek || undefined);
        setValue('dayOfMonth', transaction.dayOfMonth || undefined);
        setValue('monthOfYear', transaction.monthOfYear || undefined);
        setValue('startDate', formatDateForInput(transaction.startDate));
        setValue('endDate', formatDateForInput(transaction.endDate));
        setValue('maxOccurrences', transaction.maxOccurrences || undefined);
        setValue('notifyBeforeDays', transaction.notifyBeforeDays);
        setValue('notificationChannels', transaction.notificationChannels);
      }
    } catch (error) {
      console.error('Error loading data:', error); // Debug
      showErrorToast('Erro ao carregar dados');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Converter e limpar campos
      const maxOccurrences = data.maxOccurrences 
        ? (typeof data.maxOccurrences === 'string' 
            ? (data.maxOccurrences.trim() === '' ? undefined : parseInt(data.maxOccurrences))
            : data.maxOccurrences)
        : undefined;

      const dayOfWeek = data.dayOfWeek !== undefined && data.dayOfWeek !== null && data.dayOfWeek !== ''
        ? (typeof data.dayOfWeek === 'string' ? parseInt(data.dayOfWeek) : data.dayOfWeek)
        : undefined;

      const dayOfMonth = data.dayOfMonth !== undefined && data.dayOfMonth !== null && data.dayOfMonth !== ''
        ? (typeof data.dayOfMonth === 'string' ? parseInt(data.dayOfMonth) : data.dayOfMonth)
        : undefined;

      const monthOfYear = data.monthOfYear !== undefined && data.monthOfYear !== null && data.monthOfYear !== ''
        ? (typeof data.monthOfYear === 'string' ? parseInt(data.monthOfYear) : data.monthOfYear)
        : undefined;

      const payload: CreateRecurringTransactionData = {
        type: data.type,
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
        accountId: data.accountId,
        frequency: data.frequency,
        interval: data.interval,
        dayOfWeek,
        dayOfMonth,
        monthOfYear,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        maxOccurrences,
        notifyBeforeDays: data.notifyBeforeDays,
        notificationChannels: data.notificationChannels,
      };

      console.log('Payload being sent:', payload);

      if (isEditing && id) {
        await recurringTransactionsApi.update(parseInt(id), payload);
        showSuccessToast('Transação recorrente atualizada');
      } else {
        await recurringTransactionsApi.create(payload);
        showSuccessToast('Transação recorrente criada');
      }

      setLocation('/transactions/recurring');
    } catch (error: any) {
      console.error('Error saving recurring transaction:', error);
      console.error('Error response:', error.response?.data);
      showErrorToast(error.response?.data?.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  const toggleChannel = (channel: 'app' | 'email' | 'sms') => {
    const current = notificationChannels || [];
    if (current.includes(channel)) {
      setValue('notificationChannels', current.filter(c => c !== channel));
    } else {
      setValue('notificationChannels', [...current, channel]);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/transactions/recurring')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar' : 'Nova'} Transação Recorrente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure uma transação automática para receitas ou despesas fixas
          </p>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 text-2xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Como Funciona
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Quando uma transação recorrente é executada (automaticamente ou manualmente), 
                  uma transação real é criada na conta selecionada, afetando o saldo disponível. 
                  Você receberá notificações antes e após cada execução.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setValue('type', value as 'receita' | 'despesa')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Ex: Salário, Aluguel, etc."
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (AOA)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={watch('categoryId')?.toString()}
                onValueChange={(value) => setValue('categoryId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-500">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Conta */}
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select
                value={watch('accountId')?.toString()}
                onValueChange={(value) => setValue('accountId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p className="text-sm text-red-500">{errors.accountId.message}</p>
              )}
            </div>

            {/* Frequência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) => setValue('frequency', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">
                  Intervalo
                  <span className="text-xs text-gray-500 ml-1">(a cada X períodos)</span>
                </Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  {...register('interval', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500">
                  {frequency === 'daily' && 'Ex: 2 = a cada 2 dias'}
                  {frequency === 'weekly' && 'Ex: 2 = a cada 2 semanas'}
                  {frequency === 'monthly' && 'Ex: 2 = a cada 2 meses'}
                  {frequency === 'yearly' && 'Ex: 2 = a cada 2 anos'}
                </p>
              </div>
            </div>

            {/* Configurações específicas por frequência */}
            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select
                  value={watch('dayOfWeek')?.toString()}
                  onValueChange={(value) => setValue('dayOfWeek', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Domingo</SelectItem>
                    <SelectItem value="1">Segunda</SelectItem>
                    <SelectItem value="2">Terça</SelectItem>
                    <SelectItem value="3">Quarta</SelectItem>
                    <SelectItem value="4">Quinta</SelectItem>
                    <SelectItem value="5">Sexta</SelectItem>
                    <SelectItem value="6">Sábado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Dia do Mês (1-31)</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  {...register('dayOfMonth', { valueAsNumber: true })}
                  placeholder="Ex: 5 (dia 5 de cada mês)"
                />
              </div>
            )}

            {frequency === 'yearly' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthOfYear">Mês</Label>
                  <Input
                    id="monthOfYear"
                    type="number"
                    min="1"
                    max="12"
                    {...register('monthOfYear', { valueAsNumber: true })}
                    placeholder="1-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Dia</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    {...register('dayOfMonth', { valueAsNumber: true })}
                    placeholder="1-31"
                  />
                </div>
              </div>
            )}

            {/* Datas */}
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Como controlar o fim da recorrência:</strong><br/>
                  • Use <strong>Data de Fim</strong> para parar em uma data específica<br/>
                  • Use <strong>Limite de Execuções</strong> para parar após X vezes<br/>
                  • Deixe ambos vazios para recorrência ilimitada
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-500">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Fim (Opcional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate')}
                  />
                  <p className="text-xs text-gray-500">
                    Deixe vazio para sem limite de data
                  </p>
                </div>
              </div>
            </div>

            {/* Limite de ocorrências */}
            <div className="space-y-2">
              <Label htmlFor="maxOccurrences">Limite de Execuções (Opcional)</Label>
              <Input
                id="maxOccurrences"
                type="number"
                min="1"
                {...register('maxOccurrences')}
                placeholder="Deixe vazio para ilimitado"
              />
              <p className="text-xs text-gray-500">
                Ex: 12 = executar apenas 12 vezes (útil para parcelas)
              </p>
            </div>

            {/* Notificações */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notifyBeforeDays">Notificar quantos dias antes?</Label>
                <Input
                  id="notifyBeforeDays"
                  type="number"
                  min="0"
                  {...register('notifyBeforeDays', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500">
                  0 = notificar no dia da execução
                </p>
              </div>

              <div className="space-y-2">
                <Label>Canais de Notificação</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-app"
                      checked={notificationChannels?.includes('app')}
                      onCheckedChange={() => toggleChannel('app')}
                    />
                    <label htmlFor="channel-app" className="text-sm cursor-pointer flex items-center gap-2">
                      <span>App</span>
                      <span className="text-xs text-gray-500">(Notificação no sistema)</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-email"
                      checked={notificationChannels?.includes('email')}
                      onCheckedChange={() => toggleChannel('email')}
                    />
                    <label htmlFor="channel-email" className="text-sm cursor-pointer flex items-center gap-2">
                      <span>Email</span>
                      <span className="text-xs text-gray-500">(Enviado para seu e-mail)</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-sms"
                      checked={notificationChannels?.includes('sms')}
                      onCheckedChange={() => toggleChannel('sms')}
                    />
                    <label htmlFor="channel-sms" className="text-sm cursor-pointer flex items-center gap-2">
                      <span>SMS</span>
                      <span className="text-xs text-gray-500">(Enviado para seu telefone)</span>
                    </label>
                  </div>
                </div>
                {errors.notificationChannels && (
                  <p className="text-sm text-red-500">{errors.notificationChannels.message}</p>
                )}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Selecionados:</strong> {notificationChannels?.join(', ') || 'Nenhum'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/transactions/recurring')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
