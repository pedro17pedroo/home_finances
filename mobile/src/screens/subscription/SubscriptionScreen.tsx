import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Loading, EmptyState } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api, { resolveAssetUrl } from '../../services/api';

interface Plan {
  id: number;
  name: string;
  type: 'basic' | 'premium' | 'enterprise';
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  maxUsers: number;
  trialDays?: number;
}

interface PaymentMethodConfig {
  id: number;
  code: string;
  name: string;
  displayName: string;
  description: string;
  isInstant: boolean;
  waitTimeSeconds: number;
  maxWaitTimeSeconds: number;
  requiresPhone: boolean;
  requiresEmail: boolean;
  requiresReference: boolean;
  processingTime: string;
  icon: string;
  logoUrl?: string;
  displayOrder: number;
}

interface Subscription {
  id: number;
  status: 'active' | 'trial' | 'pending' | 'expired' | 'cancelled';
  startDate: string;
  endDate?: string;
  trialEndsAt?: string;
  paymentType: 'one_time' | 'recurring';
}

interface Payment {
  id: number;
  amount: string;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  referenceCode?: string;
  createdAt: string;
  paidAt?: string;
  plan?: Plan;
}

interface PlanChangePreview {
  changeType: 'upgrade' | 'downgrade';
  fromPlan: Plan | null;
  toPlan: Plan;
  daysRemaining: number;
  creditAmount: number;
  amountToPay: number;
  effectiveDate: string;
  scheduledFor?: string;
  message: string;
}

interface PlanChange {
  id: number;
  userId: number;
  fromPlanId: number;
  toPlanId: number;
  changeType: 'upgrade' | 'downgrade';
  status: 'pending' | 'completed' | 'cancelled' | 'scheduled';
  prorationCredit?: string;
  amountPaid?: string;
  effectiveDate?: string;
  scheduledFor?: string;
  paymentId?: number;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  fromPlan?: Plan;
  toPlan?: Plan;
}

type TabType = 'assinatura' | 'planos' | 'transacoes';

interface SubscriptionScreenProps {
  navigation?: any;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('assinatura');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentType, setPaymentType] = useState<'one_time' | 'recurring'>('one_time');
  const [paymentMethod, setPaymentMethod] = useState<string>('gpo');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [startTrial, setStartTrial] = useState(false);

  // Payment error/retry state
  const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [lastPaymentAttempt, setLastPaymentAttempt] = useState<{
    plan: Plan;
    paymentType: 'one_time' | 'recurring';
    paymentMethod: string;
  } | null>(null);

  // Plan change (upgrade/downgrade) state
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [planChangePreview, setPlanChangePreview] = useState<PlanChangePreview | null>(null);
  const [processingPlanChange, setProcessingPlanChange] = useState(false);
  const [pendingPlanChanges, setPendingPlanChanges] = useState<PlanChange[]>([]);
  const [useTrialWhilePending, setUseTrialWhilePending] = useState(false);

  useEffect(() => {
    loadData();
    loadPaymentMethods();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data?.data || response.data?.user || response.data;
      if (user) {
        setPayerPhone(user.phone || '');
        setPayerName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
        setPayerEmail(user.email || '');
      }
    } catch (error) {
      console.log('Could not load user data for payer info');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/subscriptions/payment-methods');
      const methods = response.data?.paymentMethods || response.data?.data?.paymentMethods || [];
      setPaymentMethods(Array.isArray(methods) ? methods : []);
      if (methods.length > 0) {
        setPaymentMethod(methods[0].code);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subscriptionRes, paymentsRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/current'),
        api.get('/subscriptions/payments'),
      ]);
      
      // Plans: response is { success: true, plans: [...] }
      const plansData = plansRes.data?.plans || plansRes.data?.data?.plans || plansRes.data?.data || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
      
      // Subscription: response is { success: true, subscription: {...}, plan: {...} }
      const subData = subscriptionRes.data?.data || subscriptionRes.data;
      setCurrentSubscription(subData?.subscription || null);
      setCurrentPlan(subData?.plan || null);
      
      // Payments: response is { success: true, payments: [...] }
      const paymentsData = paymentsRes.data?.payments || paymentsRes.data?.data?.payments || paymentsRes.data?.data || [];
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);

      // Load pending plan changes if user has subscription
      if (subData?.subscription) {
        try {
          const pendingRes = await api.get('/subscriptions/plan-changes/pending');
          const pendingData = pendingRes.data?.planChanges || pendingRes.data?.data?.planChanges || [];
          setPendingPlanChanges(Array.isArray(pendingData) ? pendingData : []);
        } catch (err) {
          console.log('Plan changes not available:', err);
          setPendingPlanChanges([]);
        }
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setPlans([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz';
  };

  const handleSelectPlan = async (plan: Plan) => {
    // If no current plan or free plan, use normal subscribe flow
    if (!currentPlan || currentPlan.price === 0) {
      if (plan.price === 0) {
        handleSubscribe(plan);
        return;
      }
      setSelectedPlan(plan);
      setPaymentStep(1);
      setStartTrial(false);
      setShowPaymentModal(true);
      return;
    }

    // User has active plan - show upgrade/downgrade preview
    setSelectedPlan(plan);
    try {
      const response = await api.get(`/subscriptions/plan-change/preview/${plan.id}`);
      const preview = response.data;
      setPlanChangePreview(preview);
      setShowPlanChangeModal(true);
    } catch (error: any) {
      showError(error.response?.data?.message || 'Não foi possível carregar a pré-visualização');
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    setSubscribing(true);
    try {
      const result = await api.post('/subscriptions/subscribe', {
        planId: plan.id,
        paymentType,
        paymentMethod,
        payerPhone,
        payerName,
        payerEmail,
        startTrial: startTrial && plan.trialDays && plan.trialDays > 0,
      });

      if (result.data?.success) {
        setShowPaymentModal(false);
        await loadData();
        
        if (plan.price === 0 || result.data?.isTrial) {
          showSuccess(result.data?.isTrial ? 'Período de teste iniciado!' : 'Assinatura ativada com sucesso!');
        } else if (result.data?.payment?.status === 'paid') {
          showSuccess('Pagamento confirmado! Assinatura ativada.');
        } else {
          Alert.alert(
            'Pagamento Pendente',
            'Siga as instruções para completar o pagamento.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao processar pagamento';
      
      // Save last payment attempt for retry
      setLastPaymentAttempt({
        plan,
        paymentType,
        paymentMethod,
      });
      setPaymentErrorMessage(errorMessage);
      setShowPaymentModal(false);
      setShowPaymentErrorModal(true);
    } finally {
      setSubscribing(false);
    }
  };

  const handleRetryPayment = () => {
    setShowPaymentErrorModal(false);
    if (lastPaymentAttempt) {
      setSelectedPlan(lastPaymentAttempt.plan);
      setPaymentType(lastPaymentAttempt.paymentType);
      setPaymentMethod(lastPaymentAttempt.paymentMethod);
      setPaymentStep(2); // Go to payment method step
      setShowPaymentModal(true);
    }
  };

  const handleStartTrialAfterError = async () => {
    if (!lastPaymentAttempt?.plan) return;
    
    setSubscribing(true);
    try {
      const result = await api.post('/subscriptions/subscribe', {
        planId: lastPaymentAttempt.plan.id,
        paymentType: 'one_time',
        paymentMethod: 'gpo',
        startTrial: true,
      });

      if (result.data?.success) {
        setShowPaymentErrorModal(false);
        setLastPaymentAttempt(null);
        await loadData();
        showSuccess('Período de teste iniciado com sucesso!');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao iniciar período de teste');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar Assinatura',
      'Tem certeza que deseja cancelar sua assinatura?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/subscriptions/cancel');
              await loadData();
              showSuccess('Assinatura cancelada');
            } catch (error) {
              showError('Erro ao cancelar assinatura');
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = async () => {
    if (!planChangePreview || !selectedPlan) return;
    
    setProcessingPlanChange(true);
    try {
      const result = await api.post('/subscriptions/upgrade', {
        planId: selectedPlan.id,
        paymentMethod,
        payerPhone,
        payerName,
        payerEmail,
        useTrialWhilePending,
      });

      setShowPlanChangeModal(false);
      setPlanChangePreview(null);

      if (result.data?.payment) {
        if (result.data.payment.status === 'paid') {
          await loadData();
          showSuccess('Upgrade concluído com sucesso!');
        } else {
          // Payment pending
          await loadData();
          Alert.alert(
            'Pagamento Pendente',
            useTrialWhilePending 
              ? 'Você pode usar o período de teste enquanto o pagamento é processado.'
              : 'Seu plano atual será mantido até o pagamento ser confirmado.',
            [{ text: 'OK' }]
          );
        }
      } else {
        await loadData();
        showSuccess(result.data?.message || 'Upgrade concluído!');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao processar upgrade');
    } finally {
      setProcessingPlanChange(false);
    }
  };

  const handleDowngrade = async () => {
    if (!planChangePreview || !selectedPlan) return;
    
    Alert.alert(
      'Confirmar Downgrade',
      `Ao fazer downgrade para ${selectedPlan.name}:\n\n• Você continuará com o plano atual até o fim do período\n• O novo plano será ativado em ${planChangePreview.scheduledFor ? new Date(planChangePreview.scheduledFor).toLocaleDateString('pt-AO') : 'data futura'}\n• Não há reembolso do valor já pago`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setProcessingPlanChange(true);
            try {
              const result = await api.post('/subscriptions/downgrade', {
                planId: selectedPlan.id,
              });

              setShowPlanChangeModal(false);
              setPlanChangePreview(null);
              await loadData();
              
              showSuccess(`Downgrade agendado para ${new Date(result.data?.effectiveDate).toLocaleDateString('pt-AO')}`);
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao agendar downgrade');
            } finally {
              setProcessingPlanChange(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelScheduledDowngrade = () => {
    Alert.alert(
      'Cancelar Downgrade?',
      'Deseja cancelar o downgrade agendado e manter seu plano atual?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar Downgrade',
          onPress: async () => {
            try {
              await api.delete('/subscriptions/downgrade');
              await loadData();
              showSuccess('Downgrade cancelado');
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao cancelar downgrade');
            }
          },
        },
      ]
    );
  };

  const closePlanChangeModal = () => {
    setShowPlanChangeModal(false);
    setPlanChangePreview(null);
    setSelectedPlan(null);
    setUseTrialWhilePending(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      active: 'success',
      trial: 'info',
      pending: 'warning',
      expired: 'error',
      cancelled: 'error',
      paid: 'success',
      failed: 'error',
    };
    const labels: Record<string, string> = {
      active: 'Ativo',
      trial: 'Teste',
      pending: 'Pendente',
      expired: 'Expirado',
      cancelled: 'Cancelado',
      paid: 'Pago',
      failed: 'Falhou',
    };
    return <Badge variant={variants[status] || 'info'} label={labels[status] || status} />;
  };

  if (loading) {
    return <Loading message="Carregando..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Assinatura</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}>
        {(['assinatura', 'planos', 'transacoes'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.surface },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'assinatura' ? 'card' : tab === 'planos' ? 'star' : 'receipt'}
              size={16}
              color={activeTab === tab ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.text : colors.textSecondary },
              ]}
            >
              {tab === 'assinatura' ? 'Assinatura' : tab === 'planos' ? 'Planos' : 'Transações'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Assinatura Tab */}
        {activeTab === 'assinatura' ? (
          <View style={styles.tabContent}>
            <Card variant="default" padding="lg">
              <View style={styles.sectionHeader}>
                <Ionicons name="card" size={20} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Status da Assinatura
                </Text>
              </View>
              
              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status</Text>
                  {currentSubscription ? (
                    getStatusBadge(currentSubscription.status)
                  ) : (
                    <Badge variant="info" label="Sem assinatura" />
                  )}
                </View>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Plano</Text>
                  <View style={styles.planRow}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>
                      {currentPlan?.name || 'Nenhum'}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Preço</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {currentPlan ? formatCurrency(currentPlan.price) : formatCurrency(0)}/mês
                  </Text>
                </View>
                {currentSubscription?.endDate ? (
                  <View style={styles.statusItem}>
                    <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Expira em</Text>
                    <Text style={[styles.statusValue, { color: colors.text }]}>
                      {new Date(currentSubscription.endDate).toLocaleDateString('pt-AO')}
                    </Text>
                  </View>
                ) : null}
                {currentSubscription?.status === 'trial' && currentSubscription?.trialEndsAt ? (
                  <View style={styles.statusItem}>
                    <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Teste termina em</Text>
                    <Text style={[styles.statusValue, { color: colors.warning }]}>
                      {new Date(currentSubscription.trialEndsAt).toLocaleDateString('pt-AO')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <Card variant="default" padding="lg" style={{ marginTop: SPACING.md }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: SPACING.md }]}>
                Ações Rápidas
              </Text>
              {(currentSubscription?.status === 'expired' || currentSubscription?.status === 'cancelled') && currentPlan ? (
                <Button
                  title="Renovar Assinatura"
                  onPress={() => {
                    setSelectedPlan(currentPlan);
                    setPaymentStep(1);
                    setShowPaymentModal(true);
                  }}
                  icon="refresh-outline"
                  fullWidth
                  style={{ marginBottom: SPACING.sm }}
                />
              ) : null}
              {currentSubscription?.status === 'trial' && currentPlan && currentPlan.price > 0 ? (
                <Button
                  title="Ativar Plano Completo"
                  onPress={() => {
                    setSelectedPlan(currentPlan);
                    setPaymentStep(1);
                    setShowPaymentModal(true);
                  }}
                  icon="checkmark-circle-outline"
                  fullWidth
                  style={{ marginBottom: SPACING.sm }}
                />
              ) : null}
              <Button
                title={!currentPlan || currentPlan.price === 0 ? 'Fazer Upgrade' : 'Alterar Plano'}
                onPress={() => setActiveTab('planos')}
                icon="star-outline"
                fullWidth
              />
              {currentSubscription?.status === 'active' ? (
                <Button
                  title="Cancelar Assinatura"
                  onPress={handleCancelSubscription}
                  variant="outline"
                  icon="close-circle-outline"
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              ) : null}
            </Card>

            {/* Scheduled Downgrades */}
            {pendingPlanChanges.filter(pc => pc.changeType === 'downgrade' && pc.status === 'scheduled').length > 0 ? (
              <Card 
                variant="default" 
                padding="lg" 
                style={{ 
                  marginTop: SPACING.md, 
                  backgroundColor: `${colors.warning}15`,
                  borderColor: colors.warning,
                  borderWidth: 1,
                }}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={20} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                    Downgrade Agendado
                  </Text>
                </View>
                {pendingPlanChanges
                  .filter(pc => pc.changeType === 'downgrade' && pc.status === 'scheduled')
                  .map((planChange) => (
                    <View key={planChange.id}>
                      <Text style={[styles.statusValue, { color: colors.text, marginBottom: SPACING.xs }]}>
                        {planChange.fromPlan?.name} → {planChange.toPlan?.name}
                      </Text>
                      <Text style={[styles.statusLabel, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
                        Será ativado em {planChange.scheduledFor ? new Date(planChange.scheduledFor).toLocaleDateString('pt-AO') : 'data futura'}
                      </Text>
                      <Button
                        title="Cancelar Downgrade"
                        onPress={handleCancelScheduledDowngrade}
                        variant="outline"
                        size="sm"
                        fullWidth
                      />
                    </View>
                  ))}
              </Card>
            ) : null}

            {/* Pending Upgrades */}
            {pendingPlanChanges.filter(pc => pc.changeType === 'upgrade' && pc.status === 'pending').length > 0 ? (
              <Card 
                variant="default" 
                padding="lg" 
                style={{ 
                  marginTop: SPACING.md, 
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                  borderWidth: 1,
                }}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                    Upgrade Pendente
                  </Text>
                </View>
                {pendingPlanChanges
                  .filter(pc => pc.changeType === 'upgrade' && pc.status === 'pending')
                  .map((planChange) => (
                    <View key={planChange.id}>
                      <Text style={[styles.statusValue, { color: colors.text, marginBottom: SPACING.xs }]}>
                        Aguardando pagamento para {planChange.toPlan?.name}
                      </Text>
                      <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                        Seu plano atual ({planChange.fromPlan?.name}) será mantido até o pagamento ser confirmado.
                      </Text>
                    </View>
                  ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {/* Planos Tab */}
        {activeTab === 'planos' ? (
          <View style={styles.tabContent}>
            {plans.length > 0 ? (
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  variant={plan.type === 'premium' ? 'elevated' : 'default'}
                  padding="lg"
                  style={[
                    styles.planCard,
                    plan.type === 'premium' && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  {plan.type === 'premium' ? (
                    <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.popularText}>Mais Popular</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.planPrice, { color: colors.text }]}>
                      {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
                    </Text>
                    {plan.price > 0 ? (
                      <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/mês</Text>
                    ) : null}
                  </View>
                  {plan.trialDays && plan.trialDays > 0 ? (
                    <View style={[styles.trialBadge, { backgroundColor: `${colors.success}20` }]}>
                      <Ionicons name="gift-outline" size={14} color={colors.success} />
                      <Text style={[styles.trialText, { color: colors.success }]}>
                        {plan.trialDays} dias de teste grátis
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.featuresList}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Button
                    title={currentPlan?.id === plan.id ? 'Plano Atual' : 'Selecionar'}
                    onPress={() => handleSelectPlan(plan)}
                    disabled={currentPlan?.id === plan.id}
                    variant={plan.type === 'premium' ? 'primary' : 'outline'}
                    fullWidth
                  />
                </Card>
              ))
            ) : (
              <EmptyState
                icon="star-outline"
                title="Nenhum plano disponível"
                description="Os planos de assinatura serão exibidos aqui quando estiverem disponíveis"
              />
            )}
          </View>
        ) : null}

        {/* Transações Tab */}
        {activeTab === 'transacoes' ? (
          <View style={styles.tabContent}>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <Card key={payment.id} variant="default" padding="md" style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                      <Ionicons
                        name="receipt"
                        size={20}
                        color={payment.status === 'paid' ? colors.success : colors.warning}
                      />
                      <View style={{ marginLeft: SPACING.sm }}>
                        <Text style={[styles.paymentPlan, { color: colors.text }]}>
                          {payment.plan?.name || 'Assinatura'}
                        </Text>
                        <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                          {new Date(payment.createdAt).toLocaleDateString('pt-AO')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={[styles.paymentAmount, { color: colors.text }]}>
                        {formatCurrency(payment.amount)}
                      </Text>
                      {getStatusBadge(payment.status)}
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="Nenhuma transação"
                description="As transações aparecerão aqui quando você fizer uma assinatura"
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assinar {selectedPlan?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {paymentStep === 1 ? (
                <View>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    Tipo de Pagamento
                  </Text>
                  
                  {/* Trial option if plan has trial days */}
                  {selectedPlan?.trialDays && selectedPlan.trialDays > 0 ? (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        { borderColor: startTrial ? colors.primary : colors.border },
                        startTrial && { backgroundColor: `${colors.primary}15` },
                      ]}
                      onPress={() => setStartTrial(!startTrial)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons 
                          name={startTrial ? 'checkbox' : 'square-outline'} 
                          size={20} 
                          color={startTrial ? colors.primary : colors.textSecondary} 
                          style={{ marginRight: SPACING.sm }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionTitle, { color: colors.text }]}>
                            Iniciar Período de Teste
                          </Text>
                          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                            {selectedPlan.trialDays} dias grátis, sem compromisso
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  
                  {!startTrial ? (
                    <>
                      {(['one_time', 'recurring'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.optionCard,
                            { borderColor: paymentType === type ? colors.primary : colors.border },
                            paymentType === type && { backgroundColor: `${colors.primary}15` },
                          ]}
                          onPress={() => setPaymentType(type)}
                        >
                          <Text style={[styles.optionTitle, { color: colors.text }]}>
                            {type === 'one_time' ? 'Pagamento Único' : 'Assinatura Mensal'}
                          </Text>
                          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                            {type === 'one_time'
                              ? 'Pague manualmente cada mês'
                              : 'Cobrança automática todo mês'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : null}
                </View>
              ) : null}

              {paymentStep === 2 ? (
                <View>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    Método de Pagamento
                  </Text>
                  {paymentMethods.length === 0 ? (
                    <View style={[styles.emptyMethods, { backgroundColor: colors.surfaceSecondary }]}>
                      <Ionicons name="card-outline" size={32} color={colors.textTertiary} />
                      <Text style={[styles.emptyMethodsText, { color: colors.textSecondary }]}>
                        A carregar métodos de pagamento...
                      </Text>
                    </View>
                  ) : (
                    paymentMethods.map((method) => {
                      const logoUrl = resolveAssetUrl(method.logoUrl);
                      return (
                        <TouchableOpacity
                          key={method.code}
                          style={[
                            styles.optionCard,
                            { borderColor: paymentMethod === method.code ? colors.primary : colors.border },
                            paymentMethod === method.code && { backgroundColor: `${colors.primary}15` },
                          ]}
                          onPress={() => setPaymentMethod(method.code)}
                        >
                          <View style={styles.methodRow}>
                            <View style={[
                              styles.methodIcon,
                              { backgroundColor: paymentMethod === method.code ? colors.primary : colors.surfaceSecondary }
                            ]}>
                              {logoUrl ? (
                                <Image 
                                  source={{ uri: logoUrl }} 
                                  style={styles.methodLogo}
                                  resizeMode="contain"
                                />
                              ) : (
                                <Ionicons 
                                  name={method.code === 'gpo' ? 'phone-portrait' : method.code === 'ekwanza' ? 'flash' : 'business'} 
                                  size={20} 
                                  color={paymentMethod === method.code ? '#FFF' : colors.primary} 
                                />
                              )}
                            </View>
                            <View style={styles.methodInfo}>
                              <View style={styles.methodHeader}>
                                <Text style={[styles.optionTitle, { color: colors.text }]}>
                                  {method.displayName}
                                </Text>
                                {method.isInstant && (
                                  <View style={[styles.instantBadge, { backgroundColor: `${colors.success}20` }]}>
                                    <Text style={[styles.instantText, { color: colors.success }]}>Instantâneo</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                                {method.description}
                              </Text>
                              {method.processingTime && (
                                <View style={styles.processingRow}>
                                  <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                                  <Text style={[styles.processingText, { color: colors.textTertiary }]}>
                                    {method.processingTime}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : null}

              {paymentStep === 3 ? (
                <View>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    Dados do Pagador
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
                    Pode alterar os dados caso outra pessoa vá efectuar o pagamento
                  </Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Nome Completo
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                    ]}
                    value={payerName}
                    onChangeText={setPayerName}
                    placeholder="Nome do pagador"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                    Telefone *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                    ]}
                    value={payerPhone}
                    onChangeText={setPayerPhone}
                    placeholder="923 456 789"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                  <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                    {paymentMethods.find(m => m.code === paymentMethod)?.isInstant
                      ? 'A notificação de pagamento será enviada para este número'
                      : 'O código de pagamento será enviado para este número'}
                  </Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                    Email
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                    ]}
                    value={payerEmail}
                    onChangeText={setPayerEmail}
                    placeholder="email@exemplo.com"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                    O comprovativo de pagamento será enviado para este email
                  </Text>

                  {/* Payment Summary */}
                  <View style={[styles.summaryCard, { backgroundColor: colors.surfaceSecondary, marginTop: SPACING.lg }]}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumo</Text>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Plano</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPlan?.name}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tipo</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>
                        {paymentType === 'one_time' ? 'Pagamento Único' : 'Assinatura'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Método</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>
                        {paymentMethods.find(m => m.code === paymentMethod)?.displayName || paymentMethod}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                      <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '600' }]}>Total</Text>
                      <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700', fontSize: 18 }]}>
                        {formatCurrency(selectedPlan?.price || 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              {paymentStep > 1 && !startTrial ? (
                <Button
                  title="Voltar"
                  variant="outline"
                  onPress={() => setPaymentStep(paymentStep - 1)}
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
              ) : null}
              <Button
                title={startTrial ? 'Iniciar Teste Grátis' : (paymentStep === 3 ? 'Confirmar' : 'Continuar')}
                onPress={() => {
                  if (startTrial && selectedPlan) {
                    // Skip payment steps for trial
                    handleSubscribe(selectedPlan);
                  } else if (paymentStep < 3) {
                    setPaymentStep(paymentStep + 1);
                  } else if (selectedPlan) {
                    handleSubscribe(selectedPlan);
                  }
                }}
                loading={subscribing}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Plan Change (Upgrade/Downgrade) Modal */}
      <Modal visible={showPlanChangeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[
                  styles.changeTypeIcon,
                  { backgroundColor: planChangePreview?.changeType === 'upgrade' ? `${colors.success}20` : `${colors.warning}20` }
                ]}>
                  <Ionicons 
                    name={planChangePreview?.changeType === 'upgrade' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                    size={24} 
                    color={planChangePreview?.changeType === 'upgrade' ? colors.success : colors.warning} 
                  />
                </View>
                <View style={{ marginLeft: SPACING.sm }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {planChangePreview?.changeType === 'upgrade' ? 'Upgrade de Plano' : 'Downgrade de Plano'}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    {planChangePreview?.fromPlan?.name || 'Sem plano'} → {planChangePreview?.toPlan?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={closePlanChangeModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Current Plan Info */}
              {planChangePreview?.fromPlan ? (
                <View style={[styles.previewCard, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Plano Atual</Text>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewValue, { color: colors.text }]}>
                      {planChangePreview.fromPlan.name}
                    </Text>
                    <Text style={[styles.previewPrice, { color: colors.text }]}>
                      {formatCurrency(planChangePreview.fromPlan.price)}/mês
                    </Text>
                  </View>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    {planChangePreview.daysRemaining} dias restantes
                  </Text>
                </View>
              ) : null}

              {/* Upgrade Flow */}
              {planChangePreview?.changeType === 'upgrade' ? (
                <>
                  {/* Proration Details */}
                  <View style={[styles.previewCard, { backgroundColor: `${colors.success}15`, borderColor: colors.success, borderWidth: 1 }]}>
                    <Text style={[styles.previewLabel, { color: colors.success }]}>Cálculo do Prorateio</Text>
                    {planChangePreview.creditAmount > 0 ? (
                      <View style={styles.previewRow}>
                        <Text style={[styles.optionDesc, { color: colors.success }]}>Crédito do plano atual</Text>
                        <Text style={[styles.previewValue, { color: colors.success }]}>
                          -{formatCurrency(planChangePreview.creditAmount)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.previewRow}>
                      <Text style={[styles.optionDesc, { color: colors.success }]}>Preço do novo plano</Text>
                      <Text style={[styles.previewValue, { color: colors.success }]}>
                        {formatCurrency(planChangePreview.toPlan.price)}
                      </Text>
                    </View>
                    <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: colors.success, paddingTop: SPACING.sm, marginTop: SPACING.sm }]}>
                      <Text style={[styles.previewValue, { color: colors.success }]}>Total a pagar</Text>
                      <Text style={[styles.previewPrice, { color: colors.success, fontWeight: '700' }]}>
                        {formatCurrency(planChangePreview.amountToPay)}
                      </Text>
                    </View>
                    <Text style={[styles.optionDesc, { color: colors.success, marginTop: SPACING.sm }]}>
                      {planChangePreview.message}
                    </Text>
                  </View>

                  {/* Payment Method Selection */}
                  <Text style={[styles.stepTitle, { color: colors.text, marginTop: SPACING.md }]}>
                    Método de Pagamento
                  </Text>
                  {paymentMethods.map((method) => {
                    const logoUrl = resolveAssetUrl(method.logoUrl);
                    return (
                      <TouchableOpacity
                        key={method.code}
                        style={[
                          styles.optionCard,
                          { borderColor: paymentMethod === method.code ? colors.primary : colors.border },
                          paymentMethod === method.code && { backgroundColor: `${colors.primary}15` },
                        ]}
                        onPress={() => setPaymentMethod(method.code)}
                      >
                        <View style={styles.methodRow}>
                          <View style={[
                            styles.methodIconSmall,
                            { backgroundColor: paymentMethod === method.code ? colors.primary : colors.surfaceSecondary }
                          ]}>
                            {logoUrl ? (
                              <Image 
                                source={{ uri: logoUrl }} 
                                style={styles.methodLogoSmall}
                                resizeMode="contain"
                              />
                            ) : (
                              <Ionicons 
                                name={method.code === 'gpo' ? 'phone-portrait' : 'business'} 
                                size={16} 
                                color={paymentMethod === method.code ? '#FFF' : colors.primary} 
                              />
                            )}
                          </View>
                          <Text style={[styles.optionTitle, { color: colors.text, flex: 1 }]}>
                            {method.displayName}
                          </Text>
                          {method.isInstant && (
                            <View style={[styles.instantBadge, { backgroundColor: `${colors.success}20` }]}>
                              <Text style={[styles.instantText, { color: colors.success }]}>Instantâneo</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Payer Information */}
                  <View style={{ marginTop: SPACING.md }}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>
                      Dados do Pagador
                    </Text>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
                      Pode alterar os dados caso outra pessoa vá efectuar o pagamento
                    </Text>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      Nome Completo
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                      ]}
                      value={payerName}
                      onChangeText={setPayerName}
                      placeholder="Nome do pagador"
                      placeholderTextColor={colors.textTertiary}
                    />

                    {paymentMethods.find(m => m.code === paymentMethod)?.requiresPhone ? (
                      <>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                          Telefone *
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                          ]}
                          value={payerPhone}
                          onChangeText={setPayerPhone}
                          placeholder="923 456 789"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="phone-pad"
                        />
                      </>
                    ) : null}

                    <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                      Email
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                      ]}
                      value={payerEmail}
                      onChangeText={setPayerEmail}
                      placeholder="email@exemplo.com"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Trial Option */}
                  {planChangePreview.toPlan.trialDays && planChangePreview.toPlan.trialDays > 0 ? (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        { borderColor: useTrialWhilePending ? colors.primary : colors.border, marginTop: SPACING.md },
                        useTrialWhilePending && { backgroundColor: `${colors.primary}15` },
                      ]}
                      onPress={() => setUseTrialWhilePending(!useTrialWhilePending)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Ionicons 
                          name={useTrialWhilePending ? 'checkbox' : 'square-outline'} 
                          size={20} 
                          color={useTrialWhilePending ? colors.primary : colors.textSecondary} 
                          style={{ marginRight: SPACING.sm, marginTop: 2 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionTitle, { color: colors.text }]}>
                            Usar período de teste enquanto o pagamento é processado
                          </Text>
                          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                            Se o pagamento ficar pendente, você pode usar {planChangePreview.toPlan.trialDays} dias de teste.
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              {/* Downgrade Flow */}
              {planChangePreview?.changeType === 'downgrade' ? (
                <View style={[styles.previewCard, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning, borderWidth: 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.warning} />
                    <Text style={[styles.previewLabel, { color: colors.warning, marginLeft: SPACING.xs }]}>
                      Informações do Downgrade
                    </Text>
                  </View>
                  <Text style={[styles.previewValue, { color: colors.text, marginBottom: SPACING.xs }]}>
                    Data de Ativação: {planChangePreview.scheduledFor 
                      ? new Date(planChangePreview.scheduledFor).toLocaleDateString('pt-AO')
                      : new Date(planChangePreview.effectiveDate).toLocaleDateString('pt-AO')}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
                    {planChangePreview.message}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.warning, paddingTop: SPACING.sm }}>
                    <Text style={[styles.optionDesc, { color: colors.warning }]}>
                      • Você continuará com o plano atual até a data acima
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.warning }]}>
                      • Não há reembolso do valor já pago
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.warning }]}>
                      • Pode cancelar o downgrade a qualquer momento
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* New Plan Summary */}
              <View style={[styles.previewCard, { backgroundColor: colors.surfaceSecondary, marginTop: SPACING.md }]}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Novo Plano</Text>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {planChangePreview?.toPlan?.name}
                  </Text>
                  <Text style={[styles.previewPrice, { color: colors.text }]}>
                    {formatCurrency(planChangePreview?.toPlan?.price || 0)}/mês
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={closePlanChangeModal}
                style={{ flex: 1, marginRight: SPACING.sm }}
              />
              {planChangePreview?.changeType === 'upgrade' ? (
                <Button
                  title="Confirmar Upgrade"
                  onPress={handleUpgrade}
                  loading={processingPlanChange}
                  disabled={paymentMethods.find(m => m.code === paymentMethod)?.requiresPhone && !payerPhone}
                  style={{ flex: 1, backgroundColor: colors.success }}
                />
              ) : (
                <Button
                  title="Agendar Downgrade"
                  onPress={handleDowngrade}
                  loading={processingPlanChange}
                  style={{ flex: 1, backgroundColor: colors.warning }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Error Modal */}
      <Modal visible={showPaymentErrorModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.changeTypeIcon, { backgroundColor: `${colors.error}20` }]}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, marginLeft: SPACING.sm }]}>
                  Erro no Pagamento
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowPaymentErrorModal(false);
                setLastPaymentAttempt(null);
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Error Message */}
              <View style={[styles.errorMessageCard, { backgroundColor: `${colors.error}10`, borderColor: colors.error }]}>
                <Ionicons name="warning" size={20} color={colors.error} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.errorMessageText, { color: colors.error }]}>
                  {paymentErrorMessage}
                </Text>
              </View>

              <Text style={[styles.stepTitle, { color: colors.text, marginTop: SPACING.lg }]}>
                O que deseja fazer?
              </Text>

              {/* Option 1: Retry with different payment method */}
              <TouchableOpacity
                style={[styles.errorOptionCard, { borderColor: colors.primary }]}
                onPress={handleRetryPayment}
              >
                <View style={[styles.errorOptionIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="card-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Alterar Método de Pagamento
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    Escolher outro método ou alterar dados do pagador
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option 2: Start trial (if plan has trial) */}
              {lastPaymentAttempt?.plan?.trialDays && lastPaymentAttempt.plan.trialDays > 0 ? (
                <TouchableOpacity
                  style={[styles.errorOptionCard, { borderColor: colors.success }]}
                  onPress={handleStartTrialAfterError}
                >
                  <View style={[styles.errorOptionIcon, { backgroundColor: `${colors.success}20` }]}>
                    <Ionicons name="gift-outline" size={24} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      Iniciar Período de Teste
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      Usar {lastPaymentAttempt.plan.trialDays} dias grátis e pagar depois
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}

              {/* Option 3: Cancel */}
              <TouchableOpacity
                style={[styles.errorOptionCard, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPaymentErrorModal(false);
                  setLastPaymentAttempt(null);
                }}
              >
                <View style={[styles.errorOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Cancelar
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    Voltar e tentar mais tarde
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  statusGrid: {
    gap: SPACING.md,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planCard: {
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 14,
    marginLeft: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  trialText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  paymentCard: {
    marginBottom: SPACING.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentPlan: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  optionCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
  },
  // Payment method styles
  emptyMethods: {
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMethodsText: {
    fontSize: 14,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  methodLogo: {
    width: 36,
    height: 36,
  },
  methodInfo: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  instantBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instantText: {
    fontSize: 10,
    fontWeight: '600',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  processingText: {
    fontSize: 11,
  },
  // Plan change modal styles
  changeTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  methodIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  methodLogoSmall: {
    width: 24,
    height: 24,
  },
  // Payer form styles
  stepDesc: {
    fontSize: 13,
  },
  inputHint: {
    fontSize: 11,
    marginTop: 4,
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  // Payment error modal styles
  errorMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorMessageText: {
    flex: 1,
    fontSize: 14,
  },
  errorOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  errorOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
});
