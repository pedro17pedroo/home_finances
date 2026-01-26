import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { Account } from '../../types';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon?: string;
  color?: string;
}

interface AddTransactionScreenProps {
  navigation?: any;
  route?: {
    params?: {
      type?: 'receita' | 'despesa';
    };
  };
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const typeParam = route?.params?.type;
  const type = typeParam === 'receita' ? 'receita' : 'despesa';
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const { showError, showSuccess } = useToast();
  
  // Estado para transação recorrente
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recurringData, setRecurringData] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    maxOccurrences: '',
    notifyBeforeDays: 1,
  });
  
  // Refs para scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const amountRef = useRef<View>(null);
  const accountRef = useRef<View>(null);
  const categoryRef = useRef<View>(null);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [accountsRes, categoriesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      
      const accountsData = accountsRes.data?.data || accountsRes.data;
      const categoriesData = categoriesRes.data?.data || categoriesRes.data;
      
      const accountsList = Array.isArray(accountsData) ? accountsData : [];
      const categoriesList = Array.isArray(categoriesData) ? categoriesData : [];
      
      setAccounts(accountsList);
      setCategories(categoriesList.filter((cat: Category) => cat.type === type));
      
      if (accountsList.length > 0) {
        setSelectedAccount(accountsList[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [type])
  );

  const scrollToField = (ref: React.RefObject<View>) => {
    if (ref.current && scrollViewRef.current) {
      ref.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset para não ficar colado no topo
            animated: true,
          });
        },
        () => {
          console.log('Failed to measure layout');
        }
      );
    }
  };

  const onSubmit = async () => {
    // Log para debug
    console.log('=== BOTÃO CLICADO ===');
    console.log('Amount:', amount);
    console.log('Selected Account:', selectedAccount?.name);
    console.log('Selected Category:', selectedCategory);
    console.log('Make Recurring:', makeRecurring);
    
    // Validar campos obrigatórios
    const validationErrors: string[] = [];
    let firstErrorRef: React.RefObject<View> | null = null;
    
    if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
      validationErrors.push('Valor deve ser maior que zero');
      if (!firstErrorRef) firstErrorRef = amountRef;
    }
    
    if (!selectedAccount) {
      validationErrors.push('Selecione uma conta');
      if (!firstErrorRef) firstErrorRef = accountRef;
    }
    
    if (!selectedCategory) {
      validationErrors.push('Selecione uma categoria');
      if (!firstErrorRef) firstErrorRef = categoryRef;
    }
    
    console.log('Validation Errors:', validationErrors);
    
    if (validationErrors.length > 0) {
      // Ativar exibição de erros de validação
      setShowValidationErrors(true);
      
      // Mostrar toast com o primeiro erro
      showError(validationErrors[0]);
      
      // Aguardar re-render antes de fazer scroll
      setTimeout(() => {
        // Scroll para o primeiro campo com erro
        if (firstErrorRef) {
          scrollToField(firstErrorRef);
        }
      }, 100);
      
      return;
    }

    setLoading(true);
    try {
      const amountValue = parseFloat(amount.replace(',', '.'));
      
      // Criar a transação
      await api.post('/transactions', {
        amount: amountValue,
        type,
        category: selectedCategory,
        accountId: selectedAccount.id,
        description: description || '',
        date: new Date().toISOString(),
      });
      
      // Se marcou para tornar recorrente, criar a recorrência também
      if (makeRecurring) {
        const categoryObj = categories.find(c => c.name === selectedCategory);
        await api.post('/recurring-transactions', {
          type,
          description: description || selectedCategory,
          amount: amountValue,
          categoryId: categoryObj?.id,
          accountId: selectedAccount.id,
          frequency: recurringData.frequency,
          interval: recurringData.interval,
          startDate: recurringData.startDate,
          endDate: recurringData.endDate || undefined,
          maxOccurrences: recurringData.maxOccurrences ? parseInt(recurringData.maxOccurrences) : undefined,
          notifyBeforeDays: recurringData.notifyBeforeDays,
          notificationChannels: ['app'],
        });
        showSuccess(`${type === 'receita' ? 'Receita' : 'Despesa'} e recorrência criadas com sucesso!`);
      } else {
        showSuccess(`${type === 'receita' ? 'Receita' : 'Despesa'} registrada com sucesso`);
      }
      
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Não foi possível registrar a transação';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz';
  };

  const getCategoryIcon = (iconName?: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'briefcase': 'briefcase',
      'laptop': 'laptop',
      'trending-up': 'trending-up',
      'storefront': 'storefront',
      'restaurant': 'restaurant',
      'car': 'car',
      'home': 'home',
      'medical': 'medical',
      'game-controller': 'game-controller',
      'school': 'school',
      'flash': 'flash',
      'shirt': 'shirt',
      'cart': 'cart',
      'cash': 'cash',
    };
    return iconMap[iconName || ''] || 'ellipsis-horizontal';
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
      yearly: 'Anual',
    };
    return labels[freq] || freq;
  };

  const getFrequencyPreview = () => {
    const { frequency, interval } = recurringData;
    if (interval === 1) {
      return getFrequencyLabel(frequency);
    }
    const units: Record<string, string> = {
      daily: 'dias',
      weekly: 'semanas',
      monthly: 'meses',
      yearly: 'anos',
    };
    return `A cada ${interval} ${units[frequency]}`;
  };

  if (loadingData) {
    return <Loading message="Carregando..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          Nova {type === 'receita' ? 'Receita' : 'Despesa'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        {/* Valor */}
        <View ref={amountRef}>
          <Card style={styles.amountCard}>
            <Text style={styles.amountLabel}>Valor</Text>
            <Input
              placeholder="0,00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.amountInput}
            />
          </Card>
        </View>

        {/* Conta */}
        <View ref={accountRef} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithRequired}>
              <Text style={[
                styles.sectionTitle,
                showValidationErrors && !selectedAccount && styles.sectionTitleError
              ]}>
                Conta
              </Text>
              <Text style={styles.requiredIndicator}>*</Text>
            </View>
            <TouchableOpacity style={styles.addNewButton} onPress={() => navigation.navigate('AddAccount', {})}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Nova</Text>
            </TouchableOpacity>
          </View>
          {showValidationErrors && !selectedAccount && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>Selecione uma conta</Text>
            </View>
          )}
          {accounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma conta disponível</Text>
              <Button title="Criar Conta" onPress={() => navigation.navigate('AddAccount', {})} variant="outline" size="sm" />
            </View>
          ) : (
            <View style={styles.accountsList}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountItem,
                    selectedAccount?.id === account.id && styles.accountItemSelected,
                    showValidationErrors && !selectedAccount && styles.accountItemError,
                  ]}
                  onPress={() => {
                    setSelectedAccount(account);
                  }}
                >
                  <View style={styles.accountInfo}>
                    <Ionicons
                      name={account.type === 'poupanca' ? 'library' : 'card'}
                      size={20}
                      color={
                        selectedAccount?.id === account.id
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                    <View style={styles.accountDetails}>
                      <Text
                        style={[
                          styles.accountName,
                          selectedAccount?.id === account.id && styles.accountNameSelected,
                        ]}
                      >
                        {account.name}
                      </Text>
                      <Text style={styles.accountBalance}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </View>
                  </View>
                  {selectedAccount?.id === account.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Categoria */}
        <View ref={categoryRef} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithRequired}>
              <Text style={[
                styles.sectionTitle,
                showValidationErrors && !selectedCategory && styles.sectionTitleError
              ]}>
                Categoria
              </Text>
              <Text style={styles.requiredIndicator}>*</Text>
            </View>
            <TouchableOpacity style={styles.addNewButton} onPress={() => navigation.navigate('AddCategory', { type })}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Nova</Text>
            </TouchableOpacity>
          </View>
          {showValidationErrors && !selectedCategory && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>Selecione uma categoria</Text>
            </View>
          )}
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma categoria disponível</Text>
              <Button title="Criar Categoria" onPress={() => navigation.navigate('AddCategory', { type })} variant="outline" size="sm" />
            </View>
          ) : (
            <View style={[
              styles.categoriesGrid,
              showValidationErrors && !selectedCategory && styles.categoriesGridError,
            ]}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.name && styles.categoryItemSelected,
                    selectedCategory === category.name && category.color && { backgroundColor: category.color },
                  ]}
                  onPress={() => {
                    setSelectedCategory(category.name);
                  }}
                >
                  <Ionicons
                    name={getCategoryIcon(category.icon)}
                    size={24}
                    color={
                      selectedCategory === category.name
                        ? 'white'
                        : category.color || COLORS.primary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryName,
                      selectedCategory === category.name && styles.categoryNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição (Opcional)</Text>
          <Input
            placeholder="Adicione uma descrição..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Toggle Transação Recorrente */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.recurringToggle}
            onPress={() => setMakeRecurring(!makeRecurring)}
          >
            <View style={[
              styles.checkbox,
              makeRecurring && styles.checkboxChecked,
            ]}>
              {makeRecurring && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Ionicons name="repeat" size={20} color={COLORS.primary} style={{ marginLeft: SPACING.sm }} />
            <Text style={styles.recurringToggleText}>
              Tornar esta transação recorrente
            </Text>
          </TouchableOpacity>

          {/* Campos de Recorrência (expandem quando checkbox marcado) */}
          {makeRecurring && (
            <Card style={styles.recurringCard}>
              <View style={styles.recurringHeader}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.recurringInfo}>
                  A transação será criada agora e repetida automaticamente
                </Text>
              </View>

              {/* Frequência */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frequência</Text>
                <View style={styles.frequencyButtons}>
                  {[
                    { value: 'daily', label: 'Diária', icon: 'today' },
                    { value: 'weekly', label: 'Semanal', icon: 'calendar' },
                    { value: 'monthly', label: 'Mensal', icon: 'calendar-outline' },
                    { value: 'yearly', label: 'Anual', icon: 'calendar-number' },
                  ].map((freq) => (
                    <TouchableOpacity
                      key={freq.value}
                      style={[
                        styles.frequencyButton,
                        recurringData.frequency === freq.value && styles.frequencyButtonActive,
                      ]}
                      onPress={() => setRecurringData({ ...recurringData, frequency: freq.value as any })}
                    >
                      <Ionicons
                        name={freq.icon as any}
                        size={16}
                        color={recurringData.frequency === freq.value ? 'white' : COLORS.primary}
                      />
                      <Text style={[
                        styles.frequencyButtonText,
                        recurringData.frequency === freq.value && styles.frequencyButtonTextActive,
                      ]}>
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Intervalo */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repetir a cada</Text>
                <View style={styles.intervalRow}>
                  <Input
                    placeholder="1"
                    value={String(recurringData.interval)}
                    onChangeText={(value) => {
                      const num = parseInt(value) || 1;
                      setRecurringData({ ...recurringData, interval: Math.max(1, num) });
                    }}
                    keyboardType="numeric"
                    style={styles.intervalInput}
                  />
                  <Text style={styles.intervalLabel}>{getFrequencyPreview()}</Text>
                </View>
              </View>

              {/* Data de Início */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data de Início</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={recurringData.startDate}
                  onChangeText={(value) => setRecurringData({ ...recurringData, startDate: value })}
                />
              </View>

              {/* Data de Fim (Opcional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data de Fim (Opcional)</Text>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={recurringData.endDate}
                  onChangeText={(value) => setRecurringData({ ...recurringData, endDate: value })}
                />
                <Text style={styles.inputHint}>Deixe em branco para repetir indefinidamente</Text>
              </View>

              {/* Máximo de Ocorrências (Opcional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Máximo de Ocorrências (Opcional)</Text>
                <Input
                  placeholder="Ex: 12"
                  value={recurringData.maxOccurrences}
                  onChangeText={(value) => setRecurringData({ ...recurringData, maxOccurrences: value })}
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>Quantas vezes deve repetir</Text>
              </View>

              {/* Notificar Antes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notificar com antecedência</Text>
                <View style={styles.notifyButtons}>
                  {[1, 2, 3, 7].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.notifyButton,
                        recurringData.notifyBeforeDays === days && styles.notifyButtonActive,
                      ]}
                      onPress={() => setRecurringData({ ...recurringData, notifyBeforeDays: days })}
                    >
                      <Text style={[
                        styles.notifyButtonText,
                        recurringData.notifyBeforeDays === days && styles.notifyButtonTextActive,
                      ]}>
                        {days} {days === 1 ? 'dia' : 'dias'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={styles.recurringPreview}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.recurringPreviewText}>
                  Esta transação será repetida {getFrequencyPreview().toLowerCase()}
                  {recurringData.maxOccurrences && ` por ${recurringData.maxOccurrences} vezes`}
                  {recurringData.endDate && ` até ${recurringData.endDate}`}
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Botão de Salvar */}
        <View style={styles.saveContainer}>
          <Button
            title={`Registrar ${type === 'receita' ? 'Receita' : 'Despesa'}`}
            onPress={onSubmit}
            loading={loading}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  amountCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  titleWithRequired: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionTitleError: {
    color: COLORS.error,
  },
  requiredIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNewText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  accountsList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}05`,
  },
  accountItemError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  accountNameSelected: {
    color: COLORS.primary,
  },
  accountBalance: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoriesGridError: {
    borderWidth: 2,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  categoryItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: 'white',
  },
  saveContainer: {
    padding: SPACING.lg,
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recurringToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  recurringCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
  },
  recurringInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  intervalInput: {
    width: 80,
  },
  intervalLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  notifyButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  notifyButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  notifyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  notifyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  notifyButtonTextActive: {
    color: 'white',
  },
  recurringPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  recurringPreviewText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});