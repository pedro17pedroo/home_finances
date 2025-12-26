import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
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
import Swal from 'sweetalert2';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import {
  getPlans,
  getPaymentMethods,
  getCurrentSubscription,
  subscribe,
  checkPaymentStatus,
  getPaymentHistory,
  cancelSubscription,
  Plan,
  Subscription,
  SubscriptionPayment,
  PaymentMethod,
  PaymentMethodConfig,
  PaymentType,
  paymentMethodNames,
  paymentMethodDescriptions,
} from '../../../shared/api/subscriptions';

type TabType = 'assinatura' | 'planos' | 'transacoes';

export function SubscriptionPage() {
  // Get tab from URL query parameter
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'assinatura');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState<PaymentMethodConfig[]>([]);
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
  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [paymentStep, setPaymentStep] = useState(1);

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
      const [plansData, paymentMethodsData, subscriptionData, paymentsData] = await Promise.all([
        getPlans(),
        getPaymentMethods(),
        getCurrentSubscription(),
        getPaymentHistory(),
      ]);
      setPlans(plansData);
      setPaymentMethodsConfig(paymentMethodsData);
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
      handleSubscribe(plan, 'one_time', 'gpo', '', '', '');
      return;
    }
    setSelectedPlan(plan);
    setPaymentStep(1);
    // Get user data from localStorage if available
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setPayerPhone(user.phone || '');
        setPayerName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
        setPayerEmail(user.email || '');
      } catch {
        setPayerPhone('');
        setPayerName('');
        setPayerEmail('');
      }
    }
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentStep(1);
    setSelectedPaymentMethod('gpo');
    setSelectedPaymentType('one_time');
  };

  const handleSubscribe = async (
    plan: Plan,
    paymentType: PaymentType,
    paymentMethod: PaymentMethod,
    phone?: string,
    name?: string,
    email?: string
  ) => {
    setSubscribing(true);
    try {
      const result = await subscribe({
        planId: plan.id,
        paymentType,
        paymentMethod,
        payerPhone: phone || payerPhone,
        payerName: name || payerName,
        payerEmail: email || payerEmail,
      });

      if (result.success) {
        setShowPaymentModal(false);

        if (plan.price === 0) {
          await loadData();
        } else if (result.payment) {
          // Check if payment was already completed (instant payment like GPO)
          if (result.payment.status === 'paid') {
            await loadData();
            await Swal.fire({
              icon: 'success',
              title: 'Pagamento Confirmado!',
              text: 'Sua assinatura foi ativada com sucesso.',
              confirmButtonText: 'Continuar',
              confirmButtonColor: '#2563eb',
            });
          } else {
            setPendingPayment(result.payment);
            setShowStatusModal(true);
          }
        }
      }
    } catch (error: any) {
      console.error('Subscribe error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.message || 'Erro ao processar assinatura',
        confirmButtonText: 'Tentar Novamente',
        confirmButtonColor: '#dc2626',
      });
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
        await Swal.fire({
          icon: 'success',
          title: 'Pagamento Confirmado!',
          text: 'Sua assinatura foi ativada com sucesso.',
          confirmButtonText: 'Continuar',
          confirmButtonColor: '#2563eb',
        });
      } else {
        await Swal.fire({
          icon: 'info',
          title: 'Pagamento Pendente',
          text: 'O pagamento ainda não foi confirmado. Tente novamente em alguns instantes.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#2563eb',
        });
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelSubscription = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancelar Assinatura',
      text: 'Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium.',
      showCancelButton: true,
      confirmButtonText: 'Sim, Cancelar',
      cancelButtonText: 'Não, Manter',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    
    if (!result.isConfirmed) return;
    
    try {
      await cancelSubscription();
      await loadData();
      await Swal.fire({
        icon: 'success',
        title: 'Assinatura Cancelada',
        text: 'Sua assinatura foi cancelada com sucesso.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb',
      });
    } catch (error) {
      console.error('Cancel error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível cancelar a assinatura. Tente novamente.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626',
      });
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
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Header do pagamento */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            <Receipt className={`w-5 h-5 ${
                              payment.status === 'paid' 
                                ? 'text-green-600' 
                                : payment.status === 'pending'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {payment.plan?.name || 'Assinatura'}
                            </p>
                            <p className="text-xs text-gray-500">
                              #{payment.id} • {new Date(payment.createdAt).toLocaleDateString('pt-AO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                      
                      {/* Detalhes do pagamento */}
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Método de Pagamento</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {paymentMethodNames[payment.paymentMethod]}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Tipo</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payment.subscription?.paymentType === 'recurring' ? 'Recorrente' : 'Único'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">
                            {payment.status === 'paid' ? 'Pago em' : 'Criado em'}
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payment.paidAt 
                              ? new Date(payment.paidAt).toLocaleDateString('pt-AO', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : new Date(payment.createdAt).toLocaleDateString('pt-AO', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Período</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payment.subscription?.startDate && payment.subscription?.endDate
                              ? `${new Date(payment.subscription.startDate).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })} - ${new Date(payment.subscription.endDate).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : payment.subscription?.startDate
                              ? `Desde ${new Date(payment.subscription.startDate).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : '-'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Referência (se existir) */}
                      {payment.referenceCode && (
                        <div className="px-4 pb-4">
                          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Referência de Pagamento</p>
                              <p className="font-mono font-medium text-gray-900 dark:text-white">
                                {payment.referenceCode}
                              </p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(payment.referenceCode!)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Copiar referência"
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

                      {/* Estado da assinatura associada */}
                      {payment.subscription && (
                        <div className="px-4 pb-4">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-500">Estado da assinatura:</span>
                            {getStatusBadge(payment.subscription.status)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma transação encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">
                    As transações aparecerão aqui quando você fizer uma assinatura
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Method Modal with Steps */}
        {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Assinar {selectedPlan.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(selectedPlan.price)}/mês
                    </p>
                  </div>
                  <button
                    onClick={closePaymentModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Step Indicator */}
                <div className="flex items-center mt-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    paymentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${paymentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    paymentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${paymentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    paymentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Tipo</span>
                  <span>Método</span>
                  <span>Pagador</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Step 1: Payment Type */}
                {paymentStep === 1 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Selecione o tipo de pagamento
                    </h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectedPaymentType('one_time')}
                        className={`w-full p-4 rounded-lg border-2 text-left ${
                          selectedPaymentType === 'one_time'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">Pagamento Único</p>
                        <p className="text-sm text-gray-500 mt-1">Pague manualmente cada mês quando quiser renovar</p>
                      </button>
                      <button
                        onClick={() => setSelectedPaymentType('recurring')}
                        className={`w-full p-4 rounded-lg border-2 text-left ${
                          selectedPaymentType === 'recurring'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">Assinatura Mensal</p>
                        <p className="text-sm text-gray-500 mt-1">Cobrança automática todo mês</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment Method */}
                {paymentStep === 2 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Selecione o método de pagamento
                    </h4>
                    <div className="space-y-3">
                      {paymentMethodsConfig.map((method) => (
                        <button
                          key={method.code}
                          onClick={() => setSelectedPaymentMethod(method.code as PaymentMethod)}
                          className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                            selectedPaymentMethod === method.code
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {method.logoUrl ? (
                              <img 
                                src={method.logoUrl} 
                                alt={method.displayName}
                                className="w-8 h-8 object-contain"
                              />
                            ) : method.code === 'ekwanza' ? (
                              <Smartphone className="w-5 h-5 text-orange-500" />
                            ) : method.code === 'gpo' ? (
                              <Zap className="w-5 h-5 text-blue-500" />
                            ) : method.code === 'ref' ? (
                              <Building2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <CreditCard className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{method.displayName}</p>
                              {method.isInstant && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  Instantâneo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            {method.processingTime && (
                              <p className="text-xs text-gray-400 mt-1">⏱ {method.processingTime}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Payer Information */}
                {paymentStep === 3 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dados do Pagador
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Pode alterar os dados caso outra pessoa vá efectuar o pagamento
                    </p>
                    
                    <div className="space-y-4">
                      {paymentMethodsConfig.find(m => m.code === selectedPaymentMethod)?.requiresPhone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Número de Telefone *
                          </label>
                          <input
                            type="tel"
                            value={payerPhone}
                            onChange={(e) => setPayerPhone(e.target.value)}
                            placeholder="Ex: 923456789"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {paymentMethodsConfig.find(m => m.code === selectedPaymentMethod)?.isInstant
                              ? 'A notificação de pagamento será enviada para este número'
                              : 'O código de pagamento será enviado para este número'}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nome do Pagador
                        </label>
                        <input
                          type="text"
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email do Pagador
                        </label>
                        <input
                          type="email"
                          value={payerEmail}
                          onChange={(e) => setPayerEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          O comprovativo de pagamento será enviado para este email
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resumo</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Plano</span>
                            <span className="font-medium text-gray-900 dark:text-white">{selectedPlan.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tipo</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedPaymentType === 'one_time' ? 'Pagamento Único' : 'Assinatura'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Método</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {paymentMethodsConfig.find(m => m.code === selectedPaymentMethod)?.displayName || paymentMethodNames[selectedPaymentMethod]}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Total</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatCurrency(selectedPlan.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                {paymentStep > 1 ? (
                  <Button
                    variant="outline"
                    onClick={() => setPaymentStep(paymentStep - 1)}
                  >
                    Voltar
                  </Button>
                ) : (
                  <Button variant="outline" onClick={closePaymentModal}>
                    Cancelar
                  </Button>
                )}
                
                {paymentStep < 3 ? (
                  <Button
                    onClick={() => setPaymentStep(paymentStep + 1)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(selectedPlan, selectedPaymentType, selectedPaymentMethod)}
                    disabled={subscribing || (paymentMethodsConfig.find(m => m.code === selectedPaymentMethod)?.requiresPhone && !payerPhone)}
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
                )}
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
