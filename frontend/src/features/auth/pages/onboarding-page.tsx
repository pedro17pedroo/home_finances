import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import {
  Check,
  Loader2,
  Smartphone,
  Zap,
  Building2,
  Landmark,
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
  Clock,
  AlertCircle,
  Moon,
  Sun,
  Star,
  Sparkles,
  CreditCard,
  Gift,
  Shield,
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { showInfo } from '../../../shared/lib/alerts';
import {
  getPlans,
  getPlanById,
  getPaymentMethods,
  Plan,
  PaymentMethodConfig,
  PaymentType,
} from '../../../shared/api/subscriptions';
import { apiClient, resolveAssetUrl } from '../../../shared/api/client';
import { useTheme } from '../../../shared/contexts/theme-context';

type Step = 'plan' | 'register' | 'payment' | 'payer' | 'processing' | 'status' | 'success';

const iconMap: Record<string, React.ComponentType<any>> = {
  Zap,
  Smartphone,
  Building2,
  Landmark,
};

export function OnboardingPage() {
  const { darkMode, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState<PaymentMethodConfig[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodConfig | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('one_time');

  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [processingTime, setProcessingTime] = useState(0);
  const [maxProcessingTime, setMaxProcessingTime] = useState(60);
  
  const [isRegistered, setIsRegistered] = useState(false);
  
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    message: string;
    discountAmount?: number;
    finalPrice?: number;
  } | null>(null);

  const [subscriptionDays, setSubscriptionDays] = useState<{
    total: number;
    billingCycle: number;
    bonusTrial: number;
    billingCycleName: string;
  } | null>(null);

  const [isTrialMode, setIsTrialMode] = useState(false);

  const prefillPayerData = () => {
    setPayerPhone(formData.phone || '');
    setPayerName(`${formData.firstName} ${formData.lastName}`.trim());
    setPayerEmail(formData.email || '');
  };

  const validatePayerData = (): boolean => {
    if (!selectedPaymentMethod) return false;
    if (selectedPaymentMethod.requiresPhone && !payerPhone.trim()) return false;
    if (selectedPaymentMethod.requiresEmail && !payerEmail.trim()) return false;
    if (payerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) return false;
    return true;
  };

  const validateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setCouponValidating(true);
    try {
      const response = await apiClient.post('/subscriptions/validate-coupon', {
        couponCode: couponCode.trim(),
        planId: selectedPlan.id,
        amount: selectedPlan.price,
      });
      setCouponResult({
        valid: response.data.valid,
        message: response.data.message,
        discountAmount: response.data.discountAmount,
        finalPrice: response.data.finalPrice,
      });
    } catch (error: any) {
      setCouponResult({
        valid: false,
        message: error.response?.data?.message || 'Erro ao validar cupão',
      });
    } finally {
      setCouponValidating(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan');
    Promise.all([loadPlans(), loadPaymentMethods()]).then(() => {
      if (planId) loadSelectedPlan(parseInt(planId));
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

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods();
      setPaymentMethodsConfig(methods);
      if (methods.length > 0) setSelectedPaymentMethod(methods[0]);
    } catch (error) {
      console.error('Error loading payment methods:', error);
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
    if (selectedPlan && selectedPlan.price === 0) {
      await handleFreeRegistration();
      return;
    }
    if (isRegistered) {
      prefillPayerData();
      setCurrentStep('payment');
      return;
    }
    setSubmitting(true);
    setFormErrors({});
    try {
      const registerResponse = await apiClient.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      if (registerResponse.data.status === 'success') {
        const loginResponse = await apiClient.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        if (token) {
          localStorage.setItem('token', token);
          setIsRegistered(true);
          prefillPayerData();
          setRegistrationSuccess(true);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        try {
          const loginResponse = await apiClient.post('/auth/login', {
            emailOrPhone: formData.email || formData.phone,
            password: formData.password,
          });
          const token = loginResponse.data.data?.token || loginResponse.data.token;
          if (token) {
            localStorage.setItem('token', token);
            setIsRegistered(true);
            prefillPayerData();
            setRegistrationSuccess(true);
            return;
          }
        } catch {
          setFormErrors({ general: 'Este email já está cadastrado. Verifique a senha ou faça login.' });
        }
      } else {
        setFormErrors({ general: error.response?.data?.message || 'Erro ao criar conta' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreeRegistration = async () => {
    setSubmitting(true);
    setFormErrors({});
    try {
      const registerResponse = await apiClient.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      if (registerResponse.data.status === 'success') {
        const loginResponse = await apiClient.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        if (token) {
          localStorage.setItem('token', token);
          await apiClient.post('/subscriptions/subscribe', {
            planId: selectedPlan!.id,
            paymentType: 'one_time',
            paymentMethod: 'gpo',
          });
          setCurrentStep('success');
        }
      }
    } catch (error: any) {
      setFormErrors({ general: error.response?.data?.message || 'Erro ao criar conta' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTrial = async () => {
    setSubmitting(true);
    try {
      const subscribeResponse = await apiClient.post('/subscriptions/subscribe', {
        planId: selectedPlan!.id,
        paymentType: 'one_time',
        paymentMethod: selectedPaymentMethod?.code || 'gpo',
        startTrial: true,
      });
      if (subscribeResponse.data.success) {
        setIsTrialMode(true);
        setCurrentStep('success');
      }
    } catch (error: any) {
      setFormErrors({ general: error.response?.data?.message || 'Erro ao iniciar período de teste' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) return;
    setSubmitting(true);
    setFormErrors({});
    setCurrentStep('processing');
    setProcessingTime(0);
    setMaxProcessingTime(selectedPaymentMethod.waitTimeSeconds || 60);
    try {
      const subscribeResponse = await apiClient.post('/subscriptions/subscribe', {
        planId: selectedPlan!.id,
        paymentType,
        paymentMethod: selectedPaymentMethod.code,
        payerPhone: payerPhone || undefined,
        payerName: payerName || undefined,
        payerEmail: payerEmail || undefined,
        couponCode: couponResult?.valid ? couponCode : undefined,
      });
      if (subscribeResponse.data.subscriptionDays) {
        setSubscriptionDays(subscribeResponse.data.subscriptionDays);
      }
      if (subscribeResponse.data.isTrial) {
        setIsTrialMode(true);
        setCurrentStep('success');
        return;
      }
      if (subscribeResponse.data.success && subscribeResponse.data.payment) {
        if (subscribeResponse.data.payment.status === 'paid') {
          setIsTrialMode(false);
          setCurrentStep('success');
          return;
        }
        setPendingPayment(subscribeResponse.data.payment);
        if (selectedPaymentMethod.isInstant) {
          startPaymentPolling(subscribeResponse.data.payment.id);
        } else {
          setCurrentStep('status');
        }
      } else if (subscribeResponse.data.success) {
        setIsTrialMode(false);
        setCurrentStep('success');
      }
    } catch (error: any) {
      setCurrentStep('payer');
      setFormErrors({ general: error.response?.data?.message || 'Erro ao processar pagamento' });
    } finally {
      setSubmitting(false);
    }
  };

  const startPaymentPolling = useCallback(async (paymentId: number) => {
    const maxTime = selectedPaymentMethod?.maxWaitTimeSeconds || 120;
    const interval = 3000;
    let elapsed = 0;
    const poll = async () => {
      try {
        const response = await apiClient.get(`/subscriptions/payment/${paymentId}/status`);
        if (response.data.isPaid) {
          setCurrentStep('success');
          return;
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
      elapsed += interval / 1000;
      setProcessingTime(elapsed);
      if (elapsed < maxTime) {
        setTimeout(poll, interval);
      } else {
        setCurrentStep('status');
      }
    };
    poll();
  }, [selectedPaymentMethod]);

  const handleCheckStatus = async () => {
    if (!pendingPayment) return;
    setCheckingStatus(true);
    try {
      const response = await apiClient.get(`/subscriptions/payment/${pendingPayment.id}/status`);
      if (response.data.isPaid) {
        setCurrentStep('success');
      } else {
        await showInfo('Pagamento Pendente', 'O pagamento ainda está pendente.');
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleStartTrialWhilePending = async () => {
    if (!selectedPlan || (selectedPlan.trialDays || 0) === 0) return;
    setSubmitting(true);
    try {
      // Start trial mode for the subscription
      const response = await apiClient.post('/subscriptions/start-trial-pending', {
        planId: selectedPlan.id,
      });
      if (response.data.success) {
        // Redirect to subscription page with transactions tab
        window.location.href = '/subscription?tab=transacoes';
      }
    } catch (error: any) {
      console.error('Start trial error:', error);
      setFormErrors({ general: error.response?.data?.message || 'Erro ao iniciar período de teste' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToSubscriptions = () => {
    // Redirect to subscription page with transactions tab
    window.location.href = '/subscription?tab=transacoes';
  };

  const handleContinueToPayment = () => {
    setRegistrationSuccess(false);
    setCurrentStep('payment');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' Kz';
  };

  const getPaymentMethodIcon = (iconName: string) => {
    return iconMap[iconName] || Zap;
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'plan': return 1;
      case 'register': return 2;
      case 'payment':
      case 'payer':
      case 'processing':
      case 'status': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
                💰 FinanceControl
              </span>
            </Link>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-2">
              {[
                { num: 1, label: 'Plano' },
                { num: 2, label: 'Cadastro' },
                ...(selectedPlan && selectedPlan.price > 0 ? [{ num: 3, label: 'Pagamento' }, { num: 4, label: 'Confirmação' }] : []),
              ].map((step, idx, arr) => (
                <div key={step.num} className="flex items-center">
                  <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    getStepNumber() === step.num
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                      : getStepNumber() > step.num
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {getStepNumber() > step.num ? <Check className="w-4 h-4 mr-1" /> : null}
                    {step.num}. {step.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${getStepNumber() > step.num ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Step 1: Select Plan */}
        {currentStep === 'plan' && (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 mb-6">
                <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Comece sua jornada financeira</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                Escolha o Plano <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ideal</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Selecione o plano que melhor se adapta às suas necessidades
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                    plan.type === 'premium' 
                      ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/20'
                      : ''
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.type === 'premium' && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium px-6 py-1.5 rounded-full shadow-lg flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-yellow-300 text-yellow-300" />
                      Mais Popular
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
                    
                    {(plan.trialDays || 0) > 0 && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                          <Gift className="w-3 h-3 mr-1" />
                          {plan.trialDays} dias grátis
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatCurrency(plan.price)}
                      </span>
                      {plan.price > 0 && <span className="text-lg text-gray-500 dark:text-gray-400">/mês</span>}
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                          <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button className={`w-full py-3 text-base font-medium transition-all ${
                      plan.type === 'premium'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }`}>
                      {plan.price === 0 ? 'Começar Grátis' : (plan.trialDays || 0) > 0 ? 'Experimentar Grátis' : 'Selecionar Plano'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-12 text-center">
              <div className="flex flex-wrap justify-center gap-8 text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-green-500" />
                  <span className="text-sm">Dados Seguros</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="text-sm">Pagamento Seguro</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-purple-500" />
                  <span className="text-sm">Cancele Quando Quiser</span>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="/login">
                <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  Já tem uma conta? Entrar
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Registration */}
        {currentStep === 'register' && selectedPlan && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <button
              onClick={() => setCurrentStep('plan')}
              className="flex items-center mb-6 transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos planos
            </button>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                {registrationSuccess ? (
                  <div className="text-center py-4 animate-fadeIn">
                    <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Conta Criada com Sucesso!</h2>
                    <p className="mb-6 text-gray-500 dark:text-gray-400">
                      {(selectedPlan.trialDays || 0) > 0 
                        ? 'Escolha como deseja começar a usar o sistema.'
                        : 'Agora vamos configurar o pagamento do seu plano.'}
                    </p>
                    
                    <div className="rounded-xl p-4 mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Plano selecionado:</strong> {selectedPlan.name}
                      </p>
                      <p className="text-sm mt-1 text-blue-600 dark:text-blue-400">
                        {formatCurrency(selectedPlan.price)}/mês
                      </p>
                      {(selectedPlan.trialDays || 0) > 0 && (
                        <p className="text-sm mt-2 flex items-center justify-center text-green-700 dark:text-green-400">
                          <Gift className="w-4 h-4 mr-1" />
                          Ao pagar agora, você ganha +{selectedPlan.trialDays} dias de bónus!
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={handleContinueToPayment}
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar Agora
                      </Button>
                      
                      {(selectedPlan.trialDays || 0) > 0 && (
                        <button
                          onClick={handleStartTrial}
                          disabled={submitting}
                          className="w-full text-sm py-2 transition text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {submitting ? 'Iniciando...' : `Ou começar ${selectedPlan.trialDays} dias grátis sem pagar`}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Criar Conta</h2>
                      <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        Plano: <span className="font-medium">{selectedPlan.name}</span> - {formatCurrency(selectedPlan.price)}/mês
                        {(selectedPlan.trialDays || 0) > 0 && (
                          <span className="text-green-500 ml-1">({selectedPlan.trialDays} dias grátis)</span>
                        )}
                      </p>
                    </div>

                    {formErrors.general && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        {formErrors.general}
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nome</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <input
                              type="text"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              className={`w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                formErrors.firstName 
                                  ? 'border-red-500' 
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="Nome"
                            />
                          </div>
                          {formErrors.firstName && <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sobrenome</label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                              formErrors.lastName 
                                ? 'border-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Sobrenome"
                          />
                          {formErrors.lastName && <p className="text-red-500 text-xs mt-1">{formErrors.lastName}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                              formErrors.email 
                                ? 'border-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="seu@email.com"
                          />
                        </div>
                        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Telefone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            placeholder="9XX XXX XXX"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                              formErrors.password 
                                ? 'border-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="••••••••"
                          />
                        </div>
                        {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Confirmar Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                          <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                              formErrors.confirmPassword 
                                ? 'border-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="••••••••"
                          />
                        </div>
                        {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
                      </div>

                      <Button
                        onClick={handleRegisterSubmit}
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Criando conta...
                          </>
                        ) : (
                          <>
                            Criar Conta
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}


        {/* Step 3: Payment Method Selection */}
        {currentStep === 'payment' && selectedPlan && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <button
              onClick={() => { setRegistrationSuccess(true); setCurrentStep('register'); }}
              className="flex items-center mb-6 transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Método de Pagamento</h2>
                  <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                    {selectedPlan.name} - {formatCurrency(selectedPlan.price)}/mês
                  </p>
                </div>

                {/* Payment Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Tipo de Pagamento</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentType('one_time')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        paymentType === 'one_time' 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">Pagamento Único</p>
                      <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Pague manualmente cada mês</p>
                    </button>
                    <button
                      onClick={() => setPaymentType('recurring')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        paymentType === 'recurring' 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">Assinatura</p>
                      <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Cobrança automática mensal</p>
                    </button>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Método de Pagamento</label>
                  <div className="space-y-3">
                    {paymentMethodsConfig.map((method) => {
                      const IconComponent = getPaymentMethodIcon(method.icon);
                      const logoUrl = resolveAssetUrl(method.logoUrl);
                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method)}
                          className={`w-full p-4 rounded-xl border-2 text-left flex items-start space-x-4 transition-all ${
                            selectedPaymentMethod?.id === method.id 
                              ? 'border-blue-500 bg-blue-500/10' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
                            selectedPaymentMethod?.id === method.id 
                              ? logoUrl ? 'bg-white' : 'bg-gradient-to-r from-blue-600 to-purple-600'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={method.displayName}
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <IconComponent className={`w-6 h-6 ${selectedPaymentMethod?.id === method.id ? 'text-white' : 'text-blue-500'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 dark:text-white">{method.displayName}</p>
                              {method.isInstant && (
                                <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-medium">
                                  Instantâneo
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{method.description}</p>
                            <p className="text-xs mt-1 flex items-center text-gray-400 dark:text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {method.processingTime}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  onClick={() => setCurrentStep('payer')}
                  disabled={!selectedPaymentMethod}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Payer Data */}
        {currentStep === 'payer' && selectedPlan && selectedPaymentMethod && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <button
              onClick={() => setCurrentStep('payment')}
              className="flex items-center mb-6 transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>

            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dados do Pagador</h2>
                  <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                    {selectedPaymentMethod.displayName} - {formatCurrency(selectedPlan.price)}
                  </p>
                </div>

                {formErrors.general && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    {formErrors.general}
                  </div>
                )}

                <div className="space-y-5 mb-6">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Pode alterar os dados caso outra pessoa vá efectuar o pagamento
                  </p>

                  {selectedPaymentMethod.requiresPhone && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Número de Telefone *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input
                          type="tel"
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="Ex: 923456789"
                          className="w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nome do Pagador</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Email do Pagador {selectedPaymentMethod.requiresEmail && '*'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    <Gift className="w-4 h-4 inline mr-1" />
                    Cupão de Desconto
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponResult) setCouponResult(null); }}
                      placeholder="Digite o código"
                      className="flex-1 px-4 py-3 rounded-xl border uppercase transition focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      disabled={couponValidating}
                    />
                    {couponResult?.valid ? (
                      <Button onClick={clearCoupon} variant="outline">
                        Remover
                      </Button>
                    ) : (
                      <Button
                        onClick={validateCoupon}
                        disabled={!couponCode.trim() || couponValidating}
                        className="px-6 bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        {couponValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                      </Button>
                    )}
                  </div>
                  {couponResult && (
                    <div className={`mt-2 p-3 rounded-xl text-sm ${
                      couponResult.valid 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {couponResult.valid ? <Check className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}
                      {couponResult.message}
                    </div>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="p-5 rounded-xl mb-6 bg-gray-50 dark:bg-gray-700/50">
                  <h4 className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">Resumo do Pagamento</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Plano</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Método</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedPaymentMethod.displayName}</span>
                    </div>
                    {couponResult?.valid && couponResult.discountAmount && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                          <span className="text-gray-900 dark:text-white">{formatCurrency(selectedPlan.price)}</span>
                        </div>
                        <div className="flex justify-between text-green-500">
                          <span>Desconto</span>
                          <span className="font-medium">-{formatCurrency(couponResult.discountAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="font-medium text-gray-700 dark:text-white">Total</span>
                      <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatCurrency(couponResult?.valid && couponResult.finalPrice !== undefined ? couponResult.finalPrice : selectedPlan.price)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePaymentSubmit}
                  disabled={submitting || !validatePayerData()}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirmar Pagamento
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Modal */}
        {currentStep === 'processing' && selectedPaymentMethod && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/25">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Processando Pagamento</h2>
                  <p className="mb-6 text-gray-500 dark:text-gray-400">
                    {selectedPaymentMethod.isInstant 
                      ? 'Aguarde a confirmação no seu telefone...'
                      : 'Estamos a processar o seu pedido de pagamento...'}
                  </p>
                  
                  <div className="w-full rounded-full h-2 mb-4 bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (processingTime / maxProcessingTime) * 100)}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {selectedPaymentMethod.isInstant 
                      ? `Tempo estimado: ${selectedPaymentMethod.waitTimeSeconds} segundos`
                      : 'Isto pode demorar alguns segundos...'}
                  </p>

                  {selectedPaymentMethod.isInstant && (
                    <div className="mt-6 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Verifique o seu telefone e confirme o pagamento na aplicação {selectedPaymentMethod.displayName}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Status - Manual Verification */}
        {currentStep === 'status' && pendingPayment && selectedPaymentMethod && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/25">
                    <Receipt className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pagamento Pendente</h2>
                  <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                    Complete o pagamento usando {selectedPaymentMethod.displayName}
                  </p>
                </div>

                <div className="rounded-xl p-5 mb-6 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Valor</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(pendingPayment.amount))}
                    </span>
                  </div>

                  {pendingPayment.referenceCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Referência</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                          {pendingPayment.referenceCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(pendingPayment.referenceCode)}
                          className="p-2 rounded-lg transition hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedPaymentMethod.requiresReference && (
                  <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium mb-2 text-blue-800 dark:text-blue-300">Como pagar:</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-blue-700 dark:text-blue-400">
                      <li>Acesse o seu homebanking ou ATM</li>
                      <li>Selecione "Pagamentos" → "Serviços"</li>
                      <li>Insira a referência acima</li>
                      <li>Confirme o valor e complete o pagamento</li>
                    </ol>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25"
                  >
                    {checkingStatus ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verificando pagamento...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Verificar Pagamento
                      </>
                    )}
                  </Button>
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500">
                    Após efetuar o pagamento, clique em "Verificar Pagamento"
                  </p>
                </div>

                {/* Options while payment is pending */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Enquanto aguarda a confirmação do pagamento:
                  </p>
                  
                  <div className="space-y-3">
                    {/* Option to start trial if plan allows */}
                    {selectedPlan && (selectedPlan.trialDays || 0) > 0 && (
                      <Button
                        onClick={handleStartTrialWhilePending}
                        disabled={submitting}
                        variant="outline"
                        className="w-full py-3 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Iniciando teste...
                          </>
                        ) : (
                          <>
                            <Gift className="w-5 h-5 mr-2" />
                            Começar {selectedPlan.trialDays} dias de teste grátis
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Option to go to subscription page */}
                    <Button
                      onClick={handleGoToSubscriptions}
                      variant="ghost"
                      className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Ver outros planos ou verificar transações
                    </Button>
                  </div>
                  
                  {selectedPlan && (selectedPlan.trialDays || 0) === 0 && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                      Este plano não oferece período de teste. Aguarde a confirmação do pagamento ou escolha outro plano.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success Screen */}
        {currentStep === 'success' && (
          <div className="max-w-lg mx-auto animate-fadeIn">
            <Card className="shadow-xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                    {isTrialMode ? 'Período de Teste Iniciado!' : 'Pagamento Confirmado!'}
                  </h2>
                  <p className="mb-6 text-gray-500 dark:text-gray-400">
                    {isTrialMode 
                      ? `Você tem ${selectedPlan?.trialDays} dias para experimentar todas as funcionalidades.`
                      : subscriptionDays && subscriptionDays.bonusTrial > 0
                        ? `Sua assinatura está ativa por ${subscriptionDays.total} dias!`
                        : 'Seu pagamento foi processado com sucesso. Sua assinatura está ativa!'}
                  </p>
                  
                  <div className="rounded-xl p-5 mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      <strong>Plano:</strong> {selectedPlan?.name}
                    </p>
                    {!isTrialMode && pendingPayment && (
                      <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                        Valor pago: {formatCurrency(parseFloat(pendingPayment.amount))}
                      </p>
                    )}
                    {!isTrialMode && subscriptionDays && (
                      <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                        Acesso por {subscriptionDays.total} dias
                        {subscriptionDays.bonusTrial > 0 && (
                          <span className="font-medium"> (inclui {subscriptionDays.bonusTrial} dias de bónus!)</span>
                        )}
                      </p>
                    )}
                    {isTrialMode && (
                      <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                        Teste gratuito por {selectedPlan?.trialDays} dias
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleGoToDashboard}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Ir para o Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
