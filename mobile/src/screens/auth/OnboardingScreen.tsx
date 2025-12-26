import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Loading } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';
import api, { resolveAssetUrl } from '../../services/api';

const { width } = Dimensions.get('window');

type Step = 'welcome' | 'plan' | 'register' | 'payment' | 'payer' | 'processing' | 'success';

interface Plan {
  id: number;
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: number;
  features: string[];
  trialDays?: number;
  billingCycle?: string;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  displayName: string;
  description: string;
  isInstant: boolean;
  waitTimeSeconds: number;
  requiresPhone: boolean;
  requiresEmail: boolean;
  processingTime: string;
  icon: string;
  logoUrl?: string;
}

interface OnboardingScreenProps {
  navigation?: any;
  onComplete?: () => void;
}

const ONBOARDING_KEY = '@financecontrol_onboarding_complete';

// Welcome slides
const welcomeSlides = [
  {
    id: '1',
    icon: 'wallet' as const,
    title: 'Controle suas Finanças',
    description: 'Gerencie todas as suas contas bancárias, carteiras e investimentos em um só lugar.',
    color: '#2563EB',
  },
  {
    id: '2',
    icon: 'trending-up' as const,
    title: 'Acompanhe seus Gastos',
    description: 'Visualize para onde vai seu dinheiro com relatórios detalhados e gráficos intuitivos.',
    color: '#10B981',
  },
  {
    id: '3',
    icon: 'flag' as const,
    title: 'Alcance suas Metas',
    description: 'Defina objetivos de poupança e acompanhe seu progresso para realizar seus sonhos.',
    color: '#F59E0B',
  },
  {
    id: '4',
    icon: 'people' as const,
    title: 'Gerencie em Equipe',
    description: 'Convide familiares ou sócios para gerenciar as finanças juntos de forma organizada.',
    color: '#8B5CF6',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, onComplete }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Payment data
  const [paymentType, setPaymentType] = useState<'one_time' | 'recurring'>('one_time');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  
  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  
  // Payment state
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (currentStep === 'plan') {
      loadPlans();
      loadPaymentMethods();
    }
    // Also load payment methods when entering payment step
    if (currentStep === 'payment' && paymentMethods.length === 0) {
      loadPaymentMethods();
    }
  }, [currentStep]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/plans');
      const plansData = response.data?.plans || response.data?.data?.plans || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error('Error loading plans:', error);
      showError('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/subscriptions/payment-methods');
      const methods = response.data?.paymentMethods || response.data?.data?.paymentMethods || [];
      setPaymentMethods(Array.isArray(methods) ? methods : []);
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0]);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' Kz';
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

  const prefillPayerData = () => {
    setPayerPhone(formData.phone || '');
    setPayerName(`${formData.firstName} ${formData.lastName}`.trim());
    setPayerEmail(formData.email || '');
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentStep('register');
  };

  const handleRegisterSubmit = async () => {
    if (!validateForm()) return;
    
    // Free plan - register and subscribe directly
    if (selectedPlan && selectedPlan.price === 0) {
      await handleFreeRegistration();
      return;
    }
    
    // Already registered - go to payment
    if (isRegistered) {
      prefillPayerData();
      setCurrentStep('payment');
      return;
    }
    
    setSubmitting(true);
    setFormErrors({});
    
    try {
      // Register user
      const registerResponse = await api.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      
      if (registerResponse.data.status === 'success') {
        // Login to get token
        const loginResponse = await api.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });
        
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        const userData = loginResponse.data.data?.user || loginResponse.data.user;
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
          if (userData) {
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
          }
          setIsRegistered(true);
          prefillPayerData();
          setRegistrationSuccess(true);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        // User already exists - show error and suggest login
        const errorMessage = error.response?.data?.message || '';
        const isEmailError = errorMessage.toLowerCase().includes('email');
        const isPhoneError = errorMessage.toLowerCase().includes('phone');
        
        let translatedMessage = 'Este email/telefone já está cadastrado. Use a opção "Entrar" para fazer login na sua conta existente.';
        if (isEmailError && !isPhoneError) {
          translatedMessage = 'Este email já está cadastrado. Use a opção "Entrar" para fazer login na sua conta existente.';
        } else if (isPhoneError && !isEmailError) {
          translatedMessage = 'Este número de telefone já está cadastrado. Use a opção "Entrar" para fazer login na sua conta existente.';
        }
        
        setFormErrors({ general: translatedMessage });
      } else {
        // Translate common error messages
        let message = error.response?.data?.message || 'Erro ao criar conta';
        if (message.includes('User with this email already exists')) {
          message = 'Este email já está cadastrado. Use a opção "Entrar" para fazer login na sua conta existente.';
        } else if (message.includes('User with this phone already exists')) {
          message = 'Este número de telefone já está cadastrado. Use a opção "Entrar" para fazer login na sua conta existente.';
        }
        setFormErrors({ general: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreeRegistration = async () => {
    setSubmitting(true);
    setFormErrors({});
    
    try {
      // Register user
      const registerResponse = await api.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });
      
      if (registerResponse.data.status === 'success') {
        // Login
        const loginResponse = await api.post('/auth/login', {
          emailOrPhone: formData.email || formData.phone,
          password: formData.password,
        });
        
        const token = loginResponse.data.data?.token || loginResponse.data.token;
        const userData = loginResponse.data.data?.user || loginResponse.data.user;
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
          if (userData) {
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));
          }
          
          // Subscribe to free plan
          await api.post('/subscriptions/subscribe', {
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
      const response = await api.post('/subscriptions/subscribe', {
        planId: selectedPlan!.id,
        paymentType: 'one_time',
        paymentMethod: selectedPaymentMethod?.code || 'gpo',
        startTrial: true,
      });
      
      if (response.data.success) {
        setIsTrialMode(true);
        setCurrentStep('success');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao iniciar período de teste');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToPayment = () => {
    setRegistrationSuccess(false);
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) return;
    
    setSubmitting(true);
    setFormErrors({});
    setCurrentStep('processing');
    
    try {
      const response = await api.post('/subscriptions/subscribe', {
        planId: selectedPlan!.id,
        paymentType,
        paymentMethod: selectedPaymentMethod.code,
        payerPhone: payerPhone || undefined,
        payerName: payerName || undefined,
        payerEmail: payerEmail || undefined,
      });
      
      if (response.data.isTrial) {
        setIsTrialMode(true);
        setCurrentStep('success');
        return;
      }
      
      if (response.data.success && response.data.payment) {
        if (response.data.payment.status === 'paid') {
          setIsTrialMode(false);
          setCurrentStep('success');
          return;
        }
        
        setPendingPayment(response.data.payment);
        
        if (selectedPaymentMethod.isInstant) {
          // Start polling for instant payments
          startPaymentPolling(response.data.payment.id);
        } else {
          // Show manual verification screen
          Alert.alert(
            'Pagamento Pendente',
            'Complete o pagamento e depois verifique o status.',
            [{ text: 'OK', onPress: () => setCurrentStep('success') }]
          );
        }
      } else if (response.data.success) {
        setIsTrialMode(false);
        setCurrentStep('success');
      }
    } catch (error: any) {
      setCurrentStep('payer');
      showError(error.response?.data?.message || 'Erro ao processar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const startPaymentPolling = async (paymentId: number) => {
    const maxTime = selectedPaymentMethod?.waitTimeSeconds || 60;
    let elapsed = 0;
    const interval = 3000;
    
    const poll = async () => {
      try {
        const response = await api.get(`/subscriptions/payment/${paymentId}/status`);
        if (response.data.isPaid) {
          setCurrentStep('success');
          return;
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
      
      elapsed += interval / 1000;
      if (elapsed < maxTime) {
        setTimeout(poll, interval);
      } else {
        setCurrentStep('success');
        showSuccess('Pagamento em processamento. Verifique o status na área de assinatura.');
      }
    };
    
    poll();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      if (onComplete) {
        onComplete();
      } else {
        navigation?.replace('Main');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'plan': return 1;
      case 'register': return 2;
      case 'payment':
      case 'payer':
      case 'processing': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  const getTotalSteps = () => {
    if (!selectedPlan || selectedPlan.price === 0) return 3;
    return 4;
  };

  // Welcome slides render
  const renderWelcomeSlide = ({ item, index }: { item: typeof welcomeSlides[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.welcomeSlide, { width }]}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${item.color}15`,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.iconInner, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={64} color="#FFFFFF" />
          </View>
        </Animated.View>
        
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        
        <Text style={[styles.welcomeDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  // Welcome screen
  if (currentStep === 'welcome') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.welcomeHeader}>
          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setCurrentStep('plan')}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={welcomeSlides}
          renderItem={renderWelcomeSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setWelcomeIndex(index);
          }}
        />

        <View style={styles.paginationContainer}>
          {welcomeSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: welcomeIndex === index ? 24 : 8,
                  backgroundColor: welcomeIndex === index 
                    ? welcomeSlides[welcomeIndex].color 
                    : colors.border,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.bottomContainer}>
          <Button
            title={welcomeIndex === welcomeSlides.length - 1 ? 'Começar' : 'Próximo'}
            onPress={() => {
              if (welcomeIndex < welcomeSlides.length - 1) {
                const nextIndex = welcomeIndex + 1;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                setWelcomeIndex(nextIndex);
              } else {
                setCurrentStep('plan');
              }
            }}
            fullWidth
            size="lg"
            icon={welcomeIndex === welcomeSlides.length - 1 ? 'rocket-outline' : 'arrow-forward'}
            iconPosition="right"
            style={{ backgroundColor: welcomeSlides[welcomeIndex].color }}
          />
          
          <View style={styles.loginPrompt}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Já tem uma conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading && currentStep === 'plan') {
    return <Loading message="Carregando planos..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with progress */}
      <View style={styles.header}>
        {currentStep !== 'plan' && currentStep !== 'success' ? (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              if (currentStep === 'register') setCurrentStep('plan');
              else if (currentStep === 'payment') {
                setRegistrationSuccess(true);
                setCurrentStep('register');
              }
              else if (currentStep === 'payer') setCurrentStep('payment');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        
        <View style={styles.progressContainer}>
          {Array.from({ length: getTotalSteps() }).map((_, index) => (
            <View key={index} style={styles.progressItem}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: getStepNumber() > index 
                      ? colors.success 
                      : getStepNumber() === index + 1 
                        ? colors.primary 
                        : colors.border,
                  },
                ]}
              >
                {getStepNumber() > index + 1 ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : (
                  <Text style={styles.progressNumber}>{index + 1}</Text>
                )}
              </View>
              {index < getTotalSteps() - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    {
                      backgroundColor: getStepNumber() > index + 1 
                        ? colors.success 
                        : colors.border,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={isDark ? 'sunny' : 'moon'} 
            size={20} 
            color={isDark ? '#FCD34D' : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Step 1: Plan Selection */}
          {currentStep === 'plan' && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
                    Comece sua jornada financeira
                  </Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Escolha o Plano Ideal
                </Text>
                <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                  Selecione o plano que melhor se adapta às suas necessidades
                </Text>
              </View>

              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: plan.type === 'premium' ? colors.primary : colors.border,
                      borderWidth: plan.type === 'premium' ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelectPlan(plan)}
                  activeOpacity={0.7}
                >
                  {plan.type === 'premium' && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="star" size={12} color="#FFF" />
                      <Text style={styles.popularText}>Mais Popular</Text>
                    </View>
                  )}
                  
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  
                  {(plan.trialDays || 0) > 0 && (
                    <View style={[styles.trialBadge, { backgroundColor: `${colors.success}20` }]}>
                      <Ionicons name="gift-outline" size={14} color={colors.success} />
                      <Text style={[styles.trialText, { color: colors.success }]}>
                        {plan.trialDays} dias grátis
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.priceRow}>
                    <Text style={[styles.planPrice, { color: colors.text }]}>
                      {formatCurrency(plan.price)}
                    </Text>
                    {plan.price > 0 && (
                      <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/mês</Text>
                    )}
                  </View>
                  
                  <View style={styles.featuresList}>
                    {plan.features.slice(0, 5).map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={[styles.selectButton, { backgroundColor: plan.type === 'premium' ? colors.primary : colors.surfaceSecondary }]}>
                    <Text style={[styles.selectButtonText, { color: plan.type === 'premium' ? '#FFF' : colors.text }]}>
                      {plan.price === 0 ? 'Começar Grátis' : (plan.trialDays || 0) > 0 ? 'Experimentar Grátis' : 'Selecionar'}
                    </Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={18} 
                      color={plan.type === 'premium' ? '#FFF' : colors.text} 
                    />
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.trustBadges}>
                <View style={styles.trustItem}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>Dados Seguros</Text>
                </View>
                <View style={styles.trustItem}>
                  <Ionicons name="card" size={20} color={colors.primary} />
                  <Text style={[styles.trustText, { color: colors.textSecondary }]}>Pagamento Seguro</Text>
                </View>
              </View>

              <View style={styles.loginPrompt}>
                <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                  Já tem uma conta?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                  <Text style={[styles.loginLink, { color: colors.primary }]}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 2: Registration */}
          {currentStep === 'register' && selectedPlan && (
            <View style={styles.stepContent}>
              {registrationSuccess ? (
                // Registration success - choose trial or payment
                <View style={styles.successContainer}>
                  <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark-circle" size={48} color="#FFF" />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Conta Criada com Sucesso!
                  </Text>
                  <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                    {(selectedPlan.trialDays || 0) > 0 
                      ? 'Escolha como deseja começar a usar o sistema.'
                      : 'Agora vamos configurar o pagamento do seu plano.'}
                  </Text>
                  
                  <View style={[styles.planSummary, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
                    <Text style={[styles.planSummaryLabel, { color: colors.primary }]}>
                      Plano selecionado:
                    </Text>
                    <Text style={[styles.planSummaryName, { color: colors.text }]}>
                      {selectedPlan.name}
                    </Text>
                    <Text style={[styles.planSummaryPrice, { color: colors.primary }]}>
                      {formatCurrency(selectedPlan.price)}/mês
                    </Text>
                    {(selectedPlan.trialDays || 0) > 0 && (
                      <View style={styles.bonusInfo}>
                        <Ionicons name="gift" size={16} color={colors.success} />
                        <Text style={[styles.bonusText, { color: colors.success }]}>
                          Ao pagar agora, você ganha +{selectedPlan.trialDays} dias de bónus!
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Button
                    title="Pagar Agora"
                    onPress={handleContinueToPayment}
                    disabled={submitting}
                    fullWidth
                    icon="card-outline"
                    style={{ backgroundColor: colors.success, marginBottom: SPACING.md }}
                  />
                  
                  {(selectedPlan.trialDays || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.trialButton}
                      onPress={handleStartTrial}
                      disabled={submitting}
                    >
                      <Text style={[styles.trialButtonText, { color: colors.primary }]}>
                        {submitting ? 'Iniciando...' : `Ou começar ${selectedPlan.trialDays} dias grátis sem pagar`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Registration form
                <>
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>Criar Conta</Text>
                    <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                      Plano: {selectedPlan.name} - {formatCurrency(selectedPlan.price)}/mês
                      {(selectedPlan.trialDays || 0) > 0 && ` (${selectedPlan.trialDays} dias grátis)`}
                    </Text>
                  </View>

                  {formErrors.general ? (
                    <View style={[styles.errorBox, { backgroundColor: `${colors.error}15`, borderColor: colors.error }]}>
                      <Ionicons name="alert-circle" size={20} color={colors.error} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.general}</Text>
                        {formErrors.general.includes('cadastrado') ? (
                          <TouchableOpacity 
                            onPress={() => navigation?.navigate('Login')}
                            style={{ marginTop: SPACING.sm }}
                          >
                            <Text style={[styles.loginLink, { color: colors.primary }]}>
                              Ir para Login →
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Nome</Text>
                      <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: formErrors.firstName ? colors.error : colors.border }]}>
                        <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          value={formData.firstName}
                          onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                          placeholder="Nome"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                      {formErrors.firstName ? <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.firstName}</Text> : null}
                    </View>
                    
                    <View style={styles.formHalf}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Sobrenome</Text>
                      <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: formErrors.lastName ? colors.error : colors.border }]}>
                        <TextInput
                          style={[styles.input, { color: colors.text }]}
                          value={formData.lastName}
                          onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                          placeholder="Sobrenome"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                      {formErrors.lastName ? <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.lastName}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: formErrors.email ? colors.error : colors.border }]}>
                      <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        placeholder="seu@email.com"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    {formErrors.email ? <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.email}</Text> : null}
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Telefone</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                      <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={formData.phone}
                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        placeholder="9XX XXX XXX"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Senha</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: formErrors.password ? colors.error : colors.border }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {formErrors.password ? <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.password}</Text> : null}
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmar Senha</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: formErrors.confirmPassword ? colors.error : colors.border }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={formData.confirmPassword}
                        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                        placeholder="Repita a senha"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {formErrors.confirmPassword ? <Text style={[styles.fieldError, { color: colors.error }]}>{formErrors.confirmPassword}</Text> : null}
                  </View>

                  <Button
                    title={submitting ? 'Criando conta...' : 'Criar Conta'}
                    onPress={handleRegisterSubmit}
                    disabled={submitting}
                    loading={submitting}
                    fullWidth
                    icon="arrow-forward"
                    iconPosition="right"
                    style={{ marginTop: SPACING.md }}
                  />
                </>
              )}
            </View>
          )}


          {/* Step 3: Payment Method Selection */}
          {currentStep === 'payment' && selectedPlan && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIconCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="card" size={32} color="#FFF" />
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Método de Pagamento</Text>
                <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                  {selectedPlan.name} - {formatCurrency(selectedPlan.price)}/mês
                </Text>
              </View>

              {/* Payment Type */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Tipo de Pagamento</Text>
              <View style={styles.paymentTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeCard,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: paymentType === 'one_time' ? colors.primary : colors.border,
                      borderWidth: paymentType === 'one_time' ? 2 : 1,
                    },
                  ]}
                  onPress={() => setPaymentType('one_time')}
                >
                  <Text style={[styles.paymentTypeTitle, { color: colors.text }]}>Pagamento Único</Text>
                  <Text style={[styles.paymentTypeDesc, { color: colors.textSecondary }]}>
                    Pague manualmente cada mês
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentTypeCard,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: paymentType === 'recurring' ? colors.primary : colors.border,
                      borderWidth: paymentType === 'recurring' ? 2 : 1,
                    },
                  ]}
                  onPress={() => setPaymentType('recurring')}
                >
                  <Text style={[styles.paymentTypeTitle, { color: colors.text }]}>Assinatura</Text>
                  <Text style={[styles.paymentTypeDesc, { color: colors.textSecondary }]}>
                    Cobrança automática mensal
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Payment Methods */}
              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: SPACING.lg }]}>
                Método de Pagamento
              </Text>
              {paymentMethods.length === 0 ? (
                <View style={[styles.emptyPaymentMethods, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="card-outline" size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyPaymentText, { color: colors.textSecondary }]}>
                    Carregando métodos de pagamento...
                  </Text>
                </View>
              ) : (
                paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      { 
                        backgroundColor: colors.surface,
                        borderColor: selectedPaymentMethod?.id === method.id ? colors.primary : colors.border,
                        borderWidth: selectedPaymentMethod?.id === method.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <View style={[
                      styles.paymentMethodIcon,
                      { backgroundColor: selectedPaymentMethod?.id === method.id ? colors.primary : colors.surfaceSecondary }
                    ]}>
                      {method.logoUrl ? (
                        <Image 
                          source={{ uri: resolveAssetUrl(method.logoUrl) || '' }} 
                          style={styles.paymentMethodLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons 
                          name={method.code === 'gpo' ? 'phone-portrait' : method.code === 'ekwanza' ? 'flash' : 'business'} 
                          size={24} 
                          color={selectedPaymentMethod?.id === method.id ? '#FFF' : colors.primary} 
                        />
                      )}
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <View style={styles.paymentMethodHeader}>
                        <Text style={[styles.paymentMethodName, { color: colors.text }]}>
                          {method.displayName}
                        </Text>
                        {method.isInstant && (
                          <View style={[styles.instantBadge, { backgroundColor: `${colors.success}20` }]}>
                            <Text style={[styles.instantText, { color: colors.success }]}>Instantâneo</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>
                        {method.description}
                      </Text>
                      <View style={styles.processingTime}>
                        <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                        <Text style={[styles.processingTimeText, { color: colors.textTertiary }]}>
                          {method.processingTime}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              <Button
                title="Continuar"
                onPress={() => setCurrentStep('payer')}
                disabled={!selectedPaymentMethod}
                fullWidth
                icon="arrow-forward"
                iconPosition="right"
                style={{ marginTop: SPACING.lg }}
              />
            </View>
          )}

          {/* Step 4: Payer Data */}
          {currentStep === 'payer' && selectedPlan && selectedPaymentMethod && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Dados do Pagador</Text>
                <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                  {selectedPaymentMethod.displayName} - {formatCurrency(selectedPlan.price)}
                </Text>
              </View>

              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Pode alterar os dados caso outra pessoa vá efectuar o pagamento
              </Text>

              {selectedPaymentMethod.requiresPhone ? (
                <View style={styles.formField}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Número de Telefone *</Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={payerPhone}
                      onChangeText={setPayerPhone}
                      placeholder="Ex: 923456789"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.formField}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Nome do Pagador</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={payerName}
                    onChangeText={setPayerName}
                    placeholder="Nome completo"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Email do Pagador {selectedPaymentMethod.requiresEmail ? '*' : ''}
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={payerEmail}
                    onChangeText={setPayerEmail}
                    placeholder="email@exemplo.com"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Payment Summary */}
              <View style={[styles.paymentSummary, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumo do Pagamento</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Plano</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPlan.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Método</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPaymentMethod.displayName}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '600' }]}>Total</Text>
                  <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
                    {formatCurrency(selectedPlan.price)}
                  </Text>
                </View>
              </View>

              <Button
                title={submitting ? 'Processando...' : 'Confirmar Pagamento'}
                onPress={handlePaymentSubmit}
                disabled={submitting || (selectedPaymentMethod.requiresPhone && !payerPhone.trim())}
                loading={submitting}
                fullWidth
                icon="checkmark-circle"
                style={{ backgroundColor: colors.success, marginTop: SPACING.lg }}
              />
            </View>
          )}

          {/* Processing */}
          {currentStep === 'processing' && selectedPaymentMethod && (
            <View style={styles.processingContainer}>
              <View style={[styles.processingIcon, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
              <Text style={[styles.processingTitle, { color: colors.text }]}>
                Processando Pagamento
              </Text>
              <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>
                {selectedPaymentMethod.isInstant 
                  ? 'Aguarde a confirmação no seu telefone...'
                  : 'Estamos a processar o seu pedido de pagamento...'}
              </Text>
              
              {selectedPaymentMethod.isInstant && (
                <View style={[styles.processingAlert, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                  <Text style={[styles.processingAlertText, { color: colors.warning }]}>
                    Verifique o seu telefone e confirme o pagamento na aplicação {selectedPaymentMethod.displayName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Success */}
          {currentStep === 'success' && (
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={64} color="#FFF" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                {isTrialMode ? 'Período de Teste Iniciado!' : 'Pagamento Confirmado!'}
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                {isTrialMode 
                  ? `Você tem ${selectedPlan?.trialDays} dias para experimentar todas as funcionalidades.`
                  : 'Seu pagamento foi processado com sucesso. Sua assinatura está ativa!'}
              </Text>
              
              <View style={[styles.successBox, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
                <Text style={[styles.successBoxLabel, { color: colors.success }]}>
                  Plano: {selectedPlan?.name}
                </Text>
                {isTrialMode ? (
                  <Text style={[styles.successBoxValue, { color: colors.success }]}>
                    Teste gratuito por {selectedPlan?.trialDays} dias
                  </Text>
                ) : (
                  <Text style={[styles.successBoxValue, { color: colors.success }]}>
                    Assinatura ativa
                  </Text>
                )}
              </View>

              <Button
                title="Ir para o Dashboard"
                onPress={handleComplete}
                fullWidth
                icon="arrow-forward"
                iconPosition="right"
                style={{ marginTop: SPACING.xl }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Welcome screen styles
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  progressLine: {
    width: 20,
    height: 2,
    marginHorizontal: 4,
  },
  // Content styles
  content: {
    flex: 1,
  },
  stepContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  stepIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  // Plan card styles
  planCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: RADIUS.md,
  },
  popularText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  trialText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 14,
    marginLeft: 4,
  },
  featuresList: {
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: 13,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  // Form styles
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  formHalf: {
    flex: 1,
  },
  formField: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  // Success styles
  successContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  planSummary: {
    width: '100%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  planSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  planSummaryName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  planSummaryPrice: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  bonusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  bonusText: {
    fontSize: 12,
    marginLeft: SPACING.xs,
  },
  trialButton: {
    paddingVertical: SPACING.sm,
  },
  trialButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successBox: {
    width: '100%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  successBoxLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  successBoxValue: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  // Payment styles
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  paymentTypeCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  paymentTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentTypeDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  paymentMethodLogo: {
    width: 36,
    height: 36,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
  },
  instantBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  instantText: {
    fontSize: 10,
    fontWeight: '600',
  },
  paymentMethodDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  processingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  processingTimeText: {
    fontSize: 10,
    marginLeft: 4,
  },
  paymentSummary: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Processing styles
  processingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  processingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  processingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  processingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.lg,
  },
  processingAlertText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  // Empty payment methods styles
  emptyPaymentMethods: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyPaymentText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
