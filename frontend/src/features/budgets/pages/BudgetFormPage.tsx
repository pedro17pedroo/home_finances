import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Save, Plus, Trash2, Bell, Mail, MessageSquare } from 'lucide-react';
import {
  createBudget,
  updateBudget,
  getBudget,
  TimePeriodType,
  BudgetStatus,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  AlertConfig,
  ThresholdType,
  AlertPosition,
  ChannelType,
} from '../../../shared/api/budgets';
import { useCategories } from '../../categories/hooks/use-categories';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { SelectNative as Select } from '../../../shared/components/ui/select-native';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';

/**
 * Budget Form Page
 * 
 * Create/edit budget form with:
 * - Category selection from database
 * - Amount input
 * - Time period configuration
 * - Custom date range picker
 * - Status toggle
 * - Alert configuration with multiple channels (in-app, email, SMS)
 * - Form validation
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.2
 */
export default function BudgetFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isEditMode = !!id;

  const { data: categoriesData } = useCategories();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0');
  const [timePeriod, setTimePeriod] = useState<TimePeriodType>(TimePeriodType.MONTHLY);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [status, setStatus] = useState<BudgetStatus>(BudgetStatus.ACTIVE);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);

  // Filter categories by type (only expense categories for budgets)
  const expenseCategories = categoriesData?.filter(cat => cat.type === 'despesa') || [];

  useEffect(() => {
    if (isEditMode && id) {
      loadBudget(parseInt(id));
    }
  }, [isEditMode, id]);

  const loadBudget = async (budgetId: number) => {
    try {
      setLoading(true);
      const data = await getBudget(budgetId);
      setCategoryId(data.categoryId.toString());
      // Converter o valor para centavos (multiplicar por 100)
      setAmount((data.amount * 100).toString());
      setTimePeriod(data.timePeriod);
      setCustomStartDate(data.customStartDate || '');
      setCustomEndDate(data.customEndDate || '');
      setStatus(data.status);
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      console.error('Error loading budget:', err);
      setError('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!categoryId) {
      showErrorToast('Selecione uma categoria');
      return;
    }
    
    const numAmount = parseFloat(amount) / 100;
    if (!amount || amount === '0' || numAmount <= 0 || isNaN(numAmount)) {
      showErrorToast('Informe um valor válido');
      return;
    }
    
    if (timePeriod === TimePeriodType.CUSTOM && (!customStartDate || !customEndDate)) {
      showErrorToast('Informe as datas de início e fim para período personalizado');
      return;
    }

    try {
      setSaving(true);
      
      const budgetData = {
        categoryId: categoryId, // Manter como string
        amount: numAmount,
        timePeriod,
        customStartDate: timePeriod === TimePeriodType.CUSTOM ? customStartDate : undefined,
        customEndDate: timePeriod === TimePeriodType.CUSTOM ? customEndDate : undefined,
        status,
        alerts,
      };

      if (isEditMode && id) {
        await updateBudget(parseInt(id), budgetData as UpdateBudgetRequest);
        showSuccessToast('Orçamento atualizado com sucesso!');
      } else {
        await createBudget(budgetData as CreateBudgetRequest);
        showSuccessToast('Orçamento criado com sucesso!');
      }

      setLocation('/budgets');
    } catch (err: any) {
      console.error('Error saving budget:', err);
      showErrorToast(err.response?.data?.message || 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const addAlert = () => {
    setAlerts([
      ...alerts,
      {
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 80,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [
          { type: ChannelType.IN_APP, enabled: true },
          { type: ChannelType.EMAIL, enabled: false },
          { type: ChannelType.SMS, enabled: false },
        ],
      },
    ]);
  };

  const removeAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const updateAlert = (index: number, field: keyof AlertConfig, value: any) => {
    const newAlerts = [...alerts];
    newAlerts[index] = { ...newAlerts[index], [field]: value };
    setAlerts(newAlerts);
  };

  const updateAlertChannel = (index: number, channelType: ChannelType, enabled: boolean) => {
    const newAlerts = [...alerts];
    const channels = newAlerts[index].channels.map(ch =>
      ch.type === channelType ? { ...ch, enabled } : ch
    );
    newAlerts[index] = { ...newAlerts[index], channels };
    setAlerts(newAlerts);
  };

  const getChannelEnabled = (alert: AlertConfig, channelType: ChannelType): boolean => {
    const channel = alert.channels.find(ch => ch.type === channelType);
    return channel?.enabled || false;
  };

  const formatCurrency = (value: string): string => {
    if (!value || value === '0') return '';
    const numValue = parseFloat(value.replace(/[^\d]/g, '')) / 100;
    if (isNaN(numValue)) return '';
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(numValue);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setAmount(value || '0');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/budgets')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Atualize as informações do orçamento' : 'Crie um novo orçamento para controlar seus gastos'}
          </p>
        </div>

        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
            <CardContent className="p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Informações Básicas */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Selecione uma categoria</option>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id.toString()}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Apenas categorias de despesa podem ter orçamentos
                  </p>
                </div>

                {/* Valor do Orçamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor do Orçamento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={amount ? formatCurrency(amount) : ''}
                    onChange={handleAmountChange}
                    placeholder="Kz 0,00"
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={status === BudgetStatus.ACTIVE}
                      onChange={(e) => setStatus(e.target.checked ? BudgetStatus.ACTIVE : BudgetStatus.INACTIVE)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Orçamento Ativo
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    Orçamentos inativos não geram alertas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Período */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { value: TimePeriodType.DAILY, label: 'Diário' },
                    { value: TimePeriodType.WEEKLY, label: 'Semanal' },
                    { value: TimePeriodType.MONTHLY, label: 'Mensal' },
                    { value: TimePeriodType.ANNUAL, label: 'Anual' },
                    { value: TimePeriodType.CUSTOM, label: 'Personalizado' },
                  ].map((period) => (
                    <label key={period.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timePeriod"
                        value={period.value}
                        checked={timePeriod === period.value}
                        onChange={(e) => setTimePeriod(e.target.value as TimePeriodType)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{period.label}</span>
                    </label>
                  ))}
                </div>

                {timePeriod === TimePeriodType.CUSTOM && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Inicial <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        required={timePeriod === TimePeriodType.CUSTOM}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Final <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        required={timePeriod === TimePeriodType.CUSTOM}
                        min={customStartDate}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas */}
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Alertas e Notificações</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Configure quando e como deseja ser notificado sobre o orçamento
                    </p>
                  </div>
                  <Button type="button" onClick={addAlert} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Alerta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Bell className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>Nenhum alerta configurado</p>
                    <p className="text-sm">Clique em "Adicionar Alerta" para criar notificações</p>
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <Card key={index} className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Alerta #{index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAlert(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Limite */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Limite
                            </label>
                            <Input
                              type="number"
                              value={alert.thresholdValue}
                              onChange={(e) => updateAlert(index, 'thresholdValue', parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                          </div>

                          {/* Tipo */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Tipo
                            </label>
                            <Select
                              value={alert.thresholdType}
                              onChange={(e) => updateAlert(index, 'thresholdType', e.target.value as ThresholdType)}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            >
                              <option value={ThresholdType.PERCENTAGE}>Percentual (%)</option>
                              <option value={ThresholdType.FIXED_AMOUNT}>Valor Absoluto (Kz)</option>
                            </Select>
                          </div>

                          {/* Posição */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Quando
                            </label>
                            <Select
                              value={alert.position}
                              onChange={(e) => updateAlert(index, 'position', e.target.value as AlertPosition)}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            >
                              <option value={AlertPosition.BEFORE_LIMIT}>Antes de atingir</option>
                              <option value={AlertPosition.AFTER_LIMIT}>Após atingir</option>
                            </Select>
                          </div>
                        </div>

                        {/* Canais de Notificação */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Canais de Notificação
                          </label>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getChannelEnabled(alert, ChannelType.IN_APP)}
                                onChange={(e) => updateAlertChannel(index, ChannelType.IN_APP, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <Bell className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">App</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getChannelEnabled(alert, ChannelType.EMAIL)}
                                onChange={(e) => updateAlertChannel(index, ChannelType.EMAIL, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getChannelEnabled(alert, ChannelType.SMS)}
                                onChange={(e) => updateAlertChannel(index, ChannelType.SMS, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <MessageSquare className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">SMS</span>
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Selecione pelo menos um canal de notificação
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/budgets')}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Atualizar Orçamento' : 'Criar Orçamento'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
