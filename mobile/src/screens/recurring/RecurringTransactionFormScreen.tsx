import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import recurringTransactionsService, { CreateRecurringTransactionData } from '../../services/recurring-transactions.service';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import api from '../../services/api';

export function RecurringTransactionFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { id } = (route.params as any) || {};
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    type: 'despesa',
    description: '',
    amount: '',
    categoryId: null,
    accountId: null,
    frequency: 'monthly',
    interval: 1,
    dayOfWeek: null,
    dayOfMonth: null,
    monthOfYear: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    maxOccurrences: '',
    notifyBeforeDays: 1,
    notificationChannels: ['app'],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, categoriesRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);

      setAccounts(accountsRes.data.data.accounts || []);
      setCategories(categoriesRes.data.data.categories || []);

      if (isEditing) {
        const transaction = await recurringTransactionsService.getById(id);
        setFormData({
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          frequency: transaction.frequency,
          interval: transaction.interval,
          dayOfWeek: transaction.dayOfWeek,
          dayOfMonth: transaction.dayOfMonth,
          monthOfYear: transaction.monthOfYear,
          startDate: transaction.startDate.split('T')[0],
          endDate: transaction.endDate?.split('T')[0] || '',
          maxOccurrences: transaction.maxOccurrences?.toString() || '',
          notifyBeforeDays: transaction.notifyBeforeDays,
          notificationChannels: transaction.notificationChannels,
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);

      const payload: CreateRecurringTransactionData = {
        type: formData.type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        frequency: formData.frequency,
        interval: formData.interval,
        dayOfWeek: formData.dayOfWeek,
        dayOfMonth: formData.dayOfMonth,
        monthOfYear: formData.monthOfYear,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        maxOccurrences: formData.maxOccurrences ? parseInt(formData.maxOccurrences) : undefined,
        notifyBeforeDays: formData.notifyBeforeDays,
        notificationChannels: formData.notificationChannels,
      };

      if (isEditing) {
        await recurringTransactionsService.update(id, payload);
        Alert.alert('Sucesso', 'Transação recorrente atualizada');
      } else {
        await recurringTransactionsService.create(payload);
        Alert.alert('Sucesso', 'Transação recorrente criada');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  const toggleChannel = (channel: 'app' | 'email' | 'sms') => {
    const current = formData.notificationChannels;
    if (current.includes(channel)) {
      setFormData({
        ...formData,
        notificationChannels: current.filter((c: string) => c !== channel),
      });
    } else {
      setFormData({
        ...formData,
        notificationChannels: [...current, channel],
      });
    }
  };

  if (loading && isEditing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Tipo */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Tipo *</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'receita' && { backgroundColor: theme.colors.success },
                formData.type !== 'receita' && { backgroundColor: theme.colors.card },
              ]}
              onPress={() => setFormData({ ...formData, type: 'receita', categoryId: null })}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: formData.type === 'receita' ? '#fff' : theme.colors.text },
                ]}
              >
                Receita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.type === 'despesa' && { backgroundColor: theme.colors.error },
                formData.type !== 'despesa' && { backgroundColor: theme.colors.card },
              ]}
              onPress={() => setFormData({ ...formData, type: 'despesa', categoryId: null })}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: formData.type === 'despesa' ? '#fff' : theme.colors.text },
                ]}
              >
                Despesa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Descrição *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Ex: Salário, Aluguel, etc."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Valor */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Valor (AOA) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Categoria */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Categoria *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: theme.colors.card },
                  formData.categoryId === category.id && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setFormData({ ...formData, categoryId: category.id })}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: formData.categoryId === category.id ? '#fff' : theme.colors.text },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Conta */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Conta *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: theme.colors.card },
                  formData.accountId === account.id && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setFormData({ ...formData, accountId: account.id })}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: formData.accountId === account.id ? '#fff' : theme.colors.text },
                  ]}
                >
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Frequência */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Frequência *</Text>
          <View style={styles.frequencyButtons}>
            {[
              { value: 'daily', label: 'Diária' },
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensal' },
              { value: 'yearly', label: 'Anual' },
            ].map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyButton,
                  { backgroundColor: theme.colors.card },
                  formData.frequency === freq.value && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setFormData({ ...formData, frequency: freq.value })}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    { color: formData.frequency === freq.value ? '#fff' : theme.colors.text },
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Intervalo */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Intervalo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            value={formData.interval.toString()}
            onChangeText={(text) => setFormData({ ...formData, interval: parseInt(text) || 1 })}
            keyboardType="number-pad"
          />
        </View>

        {/* Data de Início */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Data de Início *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            value={formData.startDate}
            onChangeText={(text) => setFormData({ ...formData, startDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Notificar antes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Notificar quantos dias antes?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
            value={formData.notifyBeforeDays.toString()}
            onChangeText={(text) => setFormData({ ...formData, notifyBeforeDays: parseInt(text) || 1 })}
            keyboardType="number-pad"
          />
        </View>

        {/* Canais de Notificação */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Canais de Notificação</Text>
          <View style={styles.channelButtons}>
            {[
              { value: 'app', label: 'App', icon: 'phone-portrait' },
              { value: 'email', label: 'Email', icon: 'mail' },
              { value: 'sms', label: 'SMS', icon: 'chatbubble' },
            ].map((channel) => (
              <TouchableOpacity
                key={channel.value}
                style={[
                  styles.channelButton,
                  { backgroundColor: theme.colors.card },
                  formData.notificationChannels.includes(channel.value) && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => toggleChannel(channel.value as any)}
              >
                <Ionicons
                  name={channel.icon as any}
                  size={20}
                  color={
                    formData.notificationChannels.includes(channel.value)
                      ? '#fff'
                      : theme.colors.text
                  }
                />
                <Text
                  style={[
                    styles.channelButtonText,
                    {
                      color: formData.notificationChannels.includes(channel.value)
                        ? '#fff'
                        : theme.colors.text,
                    },
                  ]}
                >
                  {channel.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Botões de Ação */}
      <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.background }]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  channelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  channelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  channelButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {},
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
