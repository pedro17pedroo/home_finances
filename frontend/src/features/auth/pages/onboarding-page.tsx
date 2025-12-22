import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Check,
  Loader2,
  Smartphone,
  Zap,
  Building2,
  Copy,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Lock,
  Receipt,
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { showInfo } from '../../../shared/lib/alerts';
import {
  getPlans,
  getPlanById,
  Plan,
  PaymentMethod,
  PaymentType,
  paymentMethodNames,
  paymentMethodDescriptions,
} from '../../../shared/api/subscriptions';
import { apiClient } from '../../../shared/api/client';

type Step = 'plan' | 'register' | 'payment' | 'status';

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Registration form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gpo');
  const [paymentType, setPaymentType] = useState<PaymentType>('one_time');

  // Payment status
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check for plan ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan');

    loadPlans().then(() => {
      if (planId) {
        loadSelectedPlan(parseInt(planId));
      }
    });
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedPlan = async (planId: number) => {
    try {
      const plan = await getPlanById(planId);
      setSelectedPlan(plan);
      setCurrentStep('register');
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentStep('register');
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'Nome é obrigatório';
    if (!formData.lastName.trim()) errors.lastName = 'Sobrenome é obrigatório';
    if (!formData.email.trim() && !formData.phone.trim()) {
      errors.email = 'Email ou telefone é obrigatório';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    if (formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Senhas não coincidem';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async () => {
    if (!validateForm()) return;

    // For free plan, register and go to dashboard
    if (selectedPlan && selectedPlan.price === 0) {
      await handleFreeRegistration();
      return;
    }

    // For paid plans, go to payment step
    setCurrentStep('payment');
  };

  const handleFreeRegistration = async () => {
    setSubmitting(true);
    try {
      // Register user
      const registerResponse = await apiClient.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });

      if (registerResponse.data.success) {
        // Login
        const loginResponse = await apiClient.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });

        if (loginResponse.data.token) {
          localStorage.setItem('token', loginResponse.data.token);

          // Subscribe to free plan
          await apiClient.post('/subscriptions/subscribe', {
            planId: selectedPlan!.id,
            paymentType: 'one_time',
            paymentMethod: 'gpo',
          });

          // Redirect to dashboard
          window.location.href = '/dashboard';
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setFormErrors({
        general: error.response?.data?.message || 'Erro ao criar conta',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async () => {
    setSubmitting(true);
    try {
      // Register user first
      const registerResponse = await apiClient.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });

      if (registerResponse.data.success) {
        // Login to get token
        const loginResponse = await apiClient.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });

        if (loginResponse.data.token) {
          localStorage.setItem('token', loginResponse.data.token);

          // Create subscription with payment
          const subscribeResponse = await apiClient.post('/subscriptions/subscribe', {
            planId: selectedPlan!.id,
            paymentType,
            paymentMethod,
          });

          if (subscribeResponse.data.success && subscribeResponse.data.payment) {
            setPendingPayment(subscribeResponse.data.payment);
            setCurrentStep('status');
          }
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setFormErrors({
        general: error.response?.data?.message || 'Erro ao processar pagamento',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingPayment) return;
    setCheckingStatus(true);
    try {
      const response = await apiClient.get(`/subscriptions/payment/${pendingPayment.id}/status`);
      if (response.data.isPaid) {
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        await showInfo('Pagamento Pendente', 'O pagamento ainda está pendente. Tente novamente em alguns instantes.');
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return (
      new Intl.NumberFormat('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + ' Kz'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">💰</span>
              <span className="ml-2 text-xl font-bold text-gray-900">FinanceControl</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span
                className={`px-3 py-1 rounded-full ${currentStep === 'plan' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
              >
                1. Plano
              </span>
              <span
                className={`px-3 py-1 rounded-full ${currentStep === 'register' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
              >
                2. Cadastro
              </span>
              {selectedPlan && selectedPlan.price > 0 && (
                <>
                  <span
                    className={`px-3 py-1 rounded-full ${currentStep === 'payment' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                  >
                    3. Pagamento
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full ${currentStep === 'status' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                  >
                    4. Confirmação
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Select Plan */}
        {currentStep === 'plan' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Escolha seu Plano</h1>
              <p className="text-gray-600">
                Selecione o plano que melhor se adapta às suas necessidades
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`bg-white cursor-pointer transition-all hover:shadow-lg ${
                    plan.type === 'premium' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.type === 'premium' && (
                    <div className="bg-blue-500 text-white text-center py-1 text-sm font-medium">
                      Mais Popular
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-gray-500">/mês</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${
                        plan.type === 'premium'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {plan.price === 0 ? 'Começar Grátis' : 'Selecionar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-6">
              <a href="/login" className="text-blue-600 hover:underline">
                Já tem uma conta? Entrar
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Registration */}
        {currentStep === 'register' && selectedPlan && (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setCurrentStep('plan')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar aos planos
            </button>

            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Criar Conta</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Plano selecionado: {selectedPlan.name} - {formatCurrency(selectedPlan.price)}
                    /mês
                  </p>
                </div>

                {formErrors.general && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {formErrors.general}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg ${formErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nome"
                        />
                      </div>
                      {formErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sobrenome
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg ${formErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Sobrenome"
                      />
                      {formErrors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="seu@email.com"
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="9XX XXX XXX"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="••••••••"
                      />
                    </div>
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="••••••••"
                      />
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleRegisterSubmit}
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {selectedPlan.price === 0 ? 'Criar Conta' : 'Continuar'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Payment Method */}
        {currentStep === 'payment' && selectedPlan && (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setCurrentStep('register')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </button>

            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Método de Pagamento</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedPlan.name} - {formatCurrency(selectedPlan.price)}/mês
                  </p>
                </div>

                {formErrors.general && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {formErrors.general}
                  </div>
                )}

                {/* Payment Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentType('one_time')}
                      className={`p-3 rounded-lg border-2 text-left ${
                        paymentType === 'one_time'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <p className="font-medium text-gray-900">Pagamento Único</p>
                      <p className="text-xs text-gray-500">Pague manualmente cada mês</p>
                    </button>
                    <button
                      onClick={() => setPaymentType('recurring')}
                      className={`p-3 rounded-lg border-2 text-left ${
                        paymentType === 'recurring'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <p className="font-medium text-gray-900">Assinatura</p>
                      <p className="text-xs text-gray-500">Cobrança automática mensal</p>
                    </button>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento
                  </label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('ekwanza')}
                      className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                        paymentMethod === 'ekwanza'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <Smartphone className="w-6 h-6 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">E-Kwanza</p>
                        <p className="text-xs text-gray-500">{paymentMethodDescriptions.ekwanza}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('gpo')}
                      className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                        paymentMethod === 'gpo' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Zap className="w-6 h-6 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Multicaixa Express</p>
                        <p className="text-xs text-gray-500">{paymentMethodDescriptions.gpo}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('ref')}
                      className={`w-full p-4 rounded-lg border-2 text-left flex items-start space-x-3 ${
                        paymentMethod === 'ref' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Building2 className="w-6 h-6 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Referência Multicaixa</p>
                        <p className="text-xs text-gray-500">{paymentMethodDescriptions.ref}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePaymentSubmit}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Confirmar Pagamento
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Payment Status */}
        {currentStep === 'status' && pendingPayment && (
          <div className="max-w-md mx-auto">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Pagamento Pendente</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Complete o pagamento usando {paymentMethodNames[pendingPayment.paymentMethod]}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-500">Valor</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(parseFloat(pendingPayment.amount))}
                    </span>
                  </div>

                  {pendingPayment.referenceCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Referência</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-gray-900">
                          {pendingPayment.referenceCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(pendingPayment.referenceCode)}
                          className="p-1 hover:bg-gray-200 rounded"
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

                <div className="space-y-3">
                  <Button
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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

                  <p className="text-center text-sm text-gray-500">
                    Após efetuar o pagamento, clique em "Verificar Pagamento"
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
