import { useState, useEffect } from 'react';
import {
  CreditCard,
  Star,
  Receipt,
  XCircle,
  Check,
  Zap,
  Smartphone,
  Building2,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import {
  getPlans,
  getCurrentSubscription,
  subscribe,
  checkPaymentStatus,
  getPaymentHistory,
  cancelSubscription,
  Plan,
  Subscription,
  SubscriptionPayment,
  PaymentMethod,
  PaymentType,
  paymentMethodNames,
  paymentMethodDescriptions,
} from '../../../shared/api/subscriptions';

type TabType = 'assinatura' | 'planos' | 'transacoes';

export function SubscriptionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('assinatura');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('gpo');
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>('one_time');

  // Payment status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<SubscriptionPayment | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, subscriptionData, paymentsData] = await Promise.all([
        getPlans(),
        getCurrentSubscription(),
        getPaymentHistory(),
      ]);
      setPlans(plansData);
      setCurrentSubscription(subscriptionData.subscription);
      setCurrentPlan(subscriptionData.plan);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    if (plan.price === 0) {
      handleSubscribe(plan, 'one_time', 'gpo');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleSubscribe = async (
    plan: Plan,
    paymentType: PaymentType,
    paymentMethod: PaymentMethod
  ) => {
    setSubscribing(true);
    try {
      const result = await subscribe({
        planId: plan.id,
        paymentType,
        paymentMethod,
      });

      if (result.success) {
        setShowPaymentModal(false);

        if (plan.price === 0) {
          await loadData();
        } else if (result.payment) {
          setPendingPayment(result.payment);
          setShowStatusModal(true);
        }
      }
    } catch (error: any) {
      console.error('Subscribe error:', error);
      alert(error.response?.data?.message || 'Erro ao processar assinatura');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingPayment) return;
    setCheckingStatus(true);
    try {
      const result = await checkPaymentStatus(pendingPayment.id);
      if (result.isPaid) {
        setShowStatusModal(false);
        setPendingPayment(null);
        await loadData();
        alert('Pagamento confirmado! Sua assinatura foi ativada.');
      } else {
        alert('Pagamento ainda pendente. Tente novamente em alguns instantes.');
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;
    try {
      await cancelSubscription();
      await loadData();
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (
      new Intl.NumberFormat('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num) + ' Kz'
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-600',
      trial: 'bg-blue-100 text-blue-600',
      pending: 'bg-yellow-100 text-yellow-600',
      expired: 'bg-red-100 text-red-600',
      cancelled: 'bg-gray-100 text-gray-600',
      paid: 'bg-green-100 text-green-600',
      failed: 'bg-red-100 text-red-600',
    };
    const labels: Record<string, string> = {
      active: 'Ativo',
      trial: 'Período de Teste',
      pending: 'Pendente',
      expired: 'Expirado',
      cancelled: 'Cancelado',
      paid: 'Pago',
      failed: 'Falhou',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Assinatura</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gerencie seu plano, pagamentos e configurações da assinatura
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('assinatura')}
            className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'assinatura'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Assinatura
          </button>
          <button
            onClick={() => setActiveTab('planos')}
            className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'planos'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Star className="w-4 h-4 mr-2" />
            Planos
          </button>
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'transacoes'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Transações
          </button>
        </div>

        {/* Assinatura Tab */}
        {activeTab === 'assinatura' && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Status da Assinatura
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mb-6">Informações sobre sua assinatura atual</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    {currentSubscription ? (
                      getStatusBadge(currentSubscription.status)
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                        Sem assinatura
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Plano Atual</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {currentPlan?.name || 'Nenhum'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Preço</p>
                    <span className="text-gray-900 dark:text-white">
                      {currentPlan ? formatCurrency(currentPlan.price) : formatCurrency(0)}/mês
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Ações Rápidas
                </h3>
                <p className="text-sm text-gray-500 mb-6">Gerencie sua assinatura e pagamentos</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setActiveTab('planos')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {!currentPlan || currentPlan.price === 0 ? 'Fazer Upgrade' : 'Alterar Plano'}
                  </Button>
                  {currentSubscription && currentSubscription.status === 'active' && (
                    <Button
                      variant="outline"
                      onClick={handleCancelSubscription}
                      className="py-3 text-gray-600 border-gray-300"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar Assinatura
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Planos Tab */}
        {activeTab === 'planos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`bg-white dark:bg-gray-800 relative ${plan.type === 'premium' ? 'ring-2 ring-blue-500' : ''}`}
              >
                {plan.type === 'premium' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500">/mês</span>}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                      >
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={currentPlan?.id === plan.id}
                    className={`w-full ${
                      currentPlan?.id === plan.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : plan.type === 'premium'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {currentPlan?.id === plan.id ? 'Plano Atual' : 'Selecionar Plano'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Transações Tab */}
        {activeTab === 'transacoes' && (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Histórico de Pagamentos
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Todas as transações relacionadas à sua assinatura
              </p>

              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Receipt className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {paymentMethodNames[payment.paymentMethod]}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString('pt-AO')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </p>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma transação encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Method Modal */}
        {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Assinar {selectedPlan.name}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Valor: {formatCurrency(selectedPlan.price)}/mês
              </p>

              {/* Payment Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedPaymentType('one_time')}
                    className={`p-3 rounded-lg border-2 text-left ${
                      selectedPaymentType === 'one_time'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">Pagamento Único</p>
                    <p className="text-xs text-gray-500">Pague manualmente cada mês</p>
                  </button>
                  <button
                    onClick={() => setSelectedPaymentType('recurring')}
                    className={`p-3 rounded-lg border-2 text-left ${
                      selectedPaymentType === 'recurring'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">Assinatura</p>
                    <p className="text-xs text-gray-500">Cobrança automática mensal</p>
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de Pagamento
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedPaymentMethod('ekwanza')}
                    className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                      selectedPaymentMethod === 'ekwanza'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">E-Kwanza</p>
                      <p className="text-xs text-gray-500">{paymentMethodDescriptions.ekwanza}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod('gpo')}
                    className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                      selectedPaymentMethod === 'gpo'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Zap className="w-6 h-6 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Multicaixa Express</p>
                      <p className="text-xs text-gray-500">{paymentMethodDescriptions.gpo}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod('ref')}
                    className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                      selectedPaymentMethod === 'ref'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Building2 className="w-6 h-6 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Referência Multicaixa
                      </p>
                      <p className="text-xs text-gray-500">{paymentMethodDescriptions.ref}</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    handleSubscribe(selectedPlan, selectedPaymentType, selectedPaymentMethod)
                  }
                  disabled={subscribing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pagamento'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Modal */}
        {showStatusModal && pendingPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pagamento Pendente
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Complete o pagamento usando {paymentMethodNames[pendingPayment.paymentMethod]}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500">Valor</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(pendingPayment.amount)}
                  </span>
                </div>

                {pendingPayment.referenceCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Referência</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">
                        {pendingPayment.referenceCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(pendingPayment.referenceCode!)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Verificar Pagamento
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStatusModal(false);
                    setPendingPayment(null);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
