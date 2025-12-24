import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Loading, EmptyState } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

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
  const [payerPhone, setPayerPhone] = useState('');
  const [startTrial, setStartTrial] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSelectPlan = (plan: Plan) => {
    if (plan.price === 0) {
      handleSubscribe(plan);
      return;
    }
    setSelectedPlan(plan);
    setPaymentStep(1);
    setStartTrial(false);
    setShowPaymentModal(true);
  };

  const handleSubscribe = async (plan: Plan) => {
    setSubscribing(true);
    try {
      const result = await api.post('/subscriptions/subscribe', {
        planId: plan.id,
        paymentType,
        paymentMethod,
        payerPhone,
        startTrial: startTrial && plan.trialDays && plan.trialDays > 0,
      });

      if (result.data?.success) {
        setShowPaymentModal(false);
        await loadData();
        
        if (plan.price === 0 || result.data?.payment?.status === 'paid') {
          showSuccess('Assinatura ativada com sucesso!');
        } else {
          Alert.alert(
            'Pagamento Pendente',
            'Siga as instruções para completar o pagamento.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao processar assinatura');
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
                  {[
                    { id: 'gpo', name: 'GPO', desc: 'Pagamento via GPO' },
                    { id: 'ekwanza', name: 'E-Kwanza', desc: 'Pagamento via E-Kwanza' },
                    { id: 'multicaixa', name: 'Multicaixa Express', desc: 'Referência Multicaixa' },
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.optionCard,
                        { borderColor: paymentMethod === method.id ? colors.primary : colors.border },
                        paymentMethod === method.id && { backgroundColor: `${colors.primary}15` },
                      ]}
                      onPress={() => setPaymentMethod(method.id)}
                    >
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {method.name}
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                        {method.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {paymentStep === 3 ? (
                <View>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    Dados do Pagador
                  </Text>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Telefone
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
});
