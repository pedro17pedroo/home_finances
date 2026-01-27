import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useCurrency } from '../../hooks/useCurrency';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
}

export function RecurringTransactionFormScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  const route = useRoute();
  const { id } = (route.params as any) || {};
  const isEditing = !!id;
  
  const [formData, setFormData] = useState({
    type: 'despesa' as 'receita' | 'despesa',
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: '1',
    startDate: '',
    endDate: '',
    maxOccurrences: '',
    notifyBeforeDays: '1',
  });
  const [notificationChannels, setNotificationChannels] = useState<('app' | 'email' | 'sms')[]>(['app']);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      const [categoriesRes, accountsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
      ]);

      const categoriesData = categoriesRes.data?.data || categoriesRes.data;
      const accountsData = accountsRes.data?.data || accountsRes.data;

      if (isEditing) {
        const transaction = await api.get(`/recurring-transactions/${id}`);
        const data = transaction.data.data.recurringTransaction;
        
        setFormData({
          type: data.type,
          description: data.description,
          amount: data.amount,
          categoryId: data.categoryId?.toString() || '',
          accountId: data.accountId?.toString() || '',
          frequency: data.frequency,
          interval: data.interval?.toString() || '1',
          startDate: formatDateForDisplay(data.startDate),
          endDate: data.endDate ? formatDateForDisplay(data.endDate) : '',
          maxOccurrences: data.maxOccurrences?.toString() || '',
          notifyBeforeDays: data.notifyBeforeDays?.toString() || '1',
        });
        
        setNotificationChannels(data.notificationChannels || ['app']);
      }

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      showError('Não foi possível carregar os dados');
    } finally {
      setDataLoading(false);
    }
  };

  const frequencies = [
    { value: 'daily', label: 'Diária', icon: 'today' as const },
    { value: 'weekly', label: 'Semanal', icon: 'calendar' as const },
    { value: 'monthly', label: 'Mensal', icon: 'calendar-outline' as const },
    { value: 'yearly', label: 'Anual', icon: 'calendar-clear' as const },
  ];

  const notifyDaysOptions = [
    { value: '1', label: '1 dia' },
    { value: '2', label: '2 dias' },
    { value: '3', label: '3 dias' },
    { value: '7', label: '7 dias' },
  ];

  const toggleNotificationChannel = (channel: 'app' | 'email' | 'sms') => {
    setNotificationChannels(prev => {
      if (prev.includes(channel)) {
        return prev.filter(c => c !== channel);
      } else {
        return [...prev, channel];
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.description.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return false;
    }
    if (!formData.amount.trim()) {
      Alert.alert('Erro', 'Valor é obrigatório');
      return false;
    }
    if (!formData.categoryId) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return false;
    }
    if (!formData.accountId) {
      Alert.alert('Erro', 'Conta é obrigatória');
      return false;
    }
    if (!formData.startDate.trim()) {
      Alert.alert('Erro', 'Data de início é obrigatória');
      return false;
    }
    return true;
  };

  const parseDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
      
      const payload: any = {
        type: formData.type,
        description: formData.description,
        amount,
        categoryId: parseInt(formData.categoryId),
        accountId: parseInt(formData.accountId),
        frequency: formData.frequency,
        interval: parseInt(formData.interval) || 1,
        startDate: parseDate(formData.startDate),
        notifyBeforeDays: parseInt(formData.notifyBeforeDays) || 1,
        notificationChannels,
      };

      if (formData.endDate.trim()) {
        payload.endDate = parseDate(formData.endDate);
      }

      if (formData.maxOccurrences.trim()) {
        payload.maxOccurrences = parseInt(formData.maxOccurrences);
      }
      
      if (isEditing) {
        await api.put(`/recurring-transactions/${id}`, payload);
        showSuccess('Transação recorrente atualizada com sucesso!');
      } else {
        await api.post('/recurring-transactions', payload);
        showSuccess('Transação recorrente criada com sucesso!');
      }
      
      navigation.goBack();
    } catch (error: any) {
      console.error('Erro ao criar:', error);
      showError(error.response?.data?.message || 'Erro ao criar transação recorrente');
    } finally {
      setLoading(false);
    }
  };

  const formatAmountInput = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers) / 100;
    return formatCurrency(amount).replace('Kz', '').trim();
  };

  const formatDateInput = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  if (dataLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? 'Editar Recorrência' : 'Nova Recorrência'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                formData.type === 'receita' && {
                  backgroundColor: colors.success + '20',
                  borderColor: colors.success,
                },
              ]}
              onPress={() => {
                handleInputChange('type', 'receita');
                handleInputChange('categoryId', '');
              }}
            >
              <Ionicons
                name="trending-up"
                size={24}
                color={formData.type === 'receita' ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: colors.textSecondary },
                  formData.type === 'receita' && { color: colors.success },
                ]}
              >
                Receita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                formData.type === 'despesa' && {
                  backgroundColor: colors.error + '20',
                  borderColor: colors.error,
                },
              ]}
              onPress={() => {
                handleInputChange('type', 'despesa');
                handleInputChange('categoryId', '');
              }}
            >
              <Ionicons
                name="trending-down"
                size={24}
                color={formData.type === 'despesa' ? colors.error : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: colors.textSecondary },
                  formData.type === 'despesa' && { color: colors.error },
                ]}
              >
                Despesa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Descrição e Valor */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Descrição *</Text>
            <Input
              placeholder="Ex: Salário, Aluguel, etc."
              value={formData.description}
              onChangeText={(v) => handleInputChange('description', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Valor (AOA) *</Text>
            <Input
              placeholder="0.00"
              value={formData.amount}
              onChangeText={(v) => handleInputChange('amount', formatAmountInput(v))}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Categoria */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Categoria *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddCategory', { type: formData.type })}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Nova</Text>
            </TouchableOpacity>
          </View>
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma categoria disponível
              </Text>
              <Button
                title="Criar Categoria"
                onPress={() => navigation.navigate('AddCategory', { type: formData.type })}
                variant="outline"
                size="sm"
              />
            </View>
          ) : (
            <View style={styles.optionsGrid}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    formData.categoryId === cat.id.toString() && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleInputChange('categoryId', cat.id.toString())}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.textSecondary },
                      formData.categoryId === cat.id.toString() && { color: '#fff' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Conta */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Conta *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddAccount', {})}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Nova</Text>
            </TouchableOpacity>
          </View>
          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma conta disponível
              </Text>
              <Button
                title="Criar Conta"
                onPress={() => navigation.navigate('AddAccount', {})}
                variant="outline"
                size="sm"
              />
            </View>
          ) : (
            <View style={styles.accountsList}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accountItem,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    formData.accountId === acc.id.toString() && {
                      backgroundColor: colors.primary + '15',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleInputChange('accountId', acc.id.toString())}
                >
                  <Ionicons
                    name="wallet"
                    size={20}
                    color={formData.accountId === acc.id.toString() ? colors.primary : colors.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.accountName,
                        { color: colors.text },
                        formData.accountId === acc.id.toString() && { color: colors.primary },
                      ]}
                    >
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>
                      {formatCurrency(parseFloat(acc.balance || '0'))}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Frequência e Intervalo */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Frequência *</Text>
          <View style={styles.frequencyGrid}>
            {frequencies.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.frequencyButton,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  formData.frequency === f.value && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleInputChange('frequency', f.value)}
              >
                <Ionicons
                  name={f.icon}
                  size={20}
                  color={formData.frequency === f.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.frequencyText,
                    { color: colors.textSecondary },
                    formData.frequency === f.value && { color: colors.primary },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.inputGroup, { marginTop: SPACING.md }]}>
            <Text style={[styles.label, { color: colors.text }]}>Intervalo</Text>
            <Input
              placeholder="1"
              value={formData.interval}
              onChangeText={(v) => handleInputChange('interval', v.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Repetir a cada {formData.interval || '1'} {formData.frequency === 'daily' ? 'dia(s)' : formData.frequency === 'weekly' ? 'semana(s)' : formData.frequency === 'monthly' ? 'mês(es)' : 'ano(s)'}
            </Text>
          </View>
        </View>

        {/* Datas */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data de Início *</Text>
            <Input
              placeholder="DD/MM/AAAA"
              value={formData.startDate}
              onChangeText={(v) => handleInputChange('startDate', formatDateInput(v))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data de Término (Opcional)</Text>
            <Input
              placeholder="DD/MM/AAAA"
              value={formData.endDate}
              onChangeText={(v) => handleInputChange('endDate', formatDateInput(v))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Máximo de Ocorrências (Opcional)</Text>
            <Input
              placeholder="Ex: 12"
              value={formData.maxOccurrences}
              onChangeText={(v) => handleInputChange('maxOccurrences', v.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Notificações */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Notificar quantos dias antes?</Text>
          <View style={styles.notifyDaysGrid}>
            {notifyDaysOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.notifyDayButton,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  formData.notifyBeforeDays === option.value && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleInputChange('notifyBeforeDays', option.value)}
              >
                <Text
                  style={[
                    styles.notifyDayText,
                    { color: colors.textSecondary },
                    formData.notifyBeforeDays === option.value && { color: colors.primary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.inputGroup, { marginTop: SPACING.md }]}>
            <Text style={[styles.label, { color: colors.text }]}>Canais de Notificação</Text>
            <View style={styles.channelsContainer}>
              <TouchableOpacity
                style={[
                  styles.channelButton,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  notificationChannels.includes('app') && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => toggleNotificationChannel('app')}
              >
                <Ionicons
                  name={notificationChannels.includes('app') ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={notificationChannels.includes('app') ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.channelText,
                    { color: colors.text },
                    notificationChannels.includes('app') && { color: colors.primary },
                  ]}
                >
                  App
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelButton,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  notificationChannels.includes('email') && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => toggleNotificationChannel('email')}
              >
                <Ionicons
                  name={notificationChannels.includes('email') ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={notificationChannels.includes('email') ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.channelText,
                    { color: colors.text },
                    notificationChannels.includes('email') && { color: colors.primary },
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.channelButton,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  notificationChannels.includes('sms') && {
                    backgroundColor: colors.primary + '15',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => toggleNotificationChannel('sms')}
              >
                <Ionicons
                  name={notificationChannels.includes('sms') ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={notificationChannels.includes('sms') ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.channelText,
                    { color: colors.text },
                    notificationChannels.includes('sms') && { color: colors.primary },
                  ]}
                >
                  SMS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={{ flex: 1 }}
          />
          <Button
            title="Salvar"
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  card: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  accountsList: {
    gap: SPACING.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 12,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  notifyDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  notifyDayButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  notifyDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  channelsContainer: {
    gap: SPACING.sm,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  channelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
});
