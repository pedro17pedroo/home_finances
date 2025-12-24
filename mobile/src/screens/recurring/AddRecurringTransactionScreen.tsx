import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useCurrency } from '../../hooks/useCurrency';
import { COLORS, SPACING } from '../../constants/config';
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

interface Props {
  navigation: any;
}

export const AddRecurringTransactionScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    type: 'despesa' as 'receita' | 'despesa',
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when screen comes back into focus (after creating account/category)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      console.log('Fetching categories and accounts...');
      const [categoriesRes, accountsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
      ]);

      console.log('Categories response:', JSON.stringify(categoriesRes.data, null, 2));
      console.log('Accounts response:', JSON.stringify(accountsRes.data, null, 2));

      // Handle different response formats
      const categoriesData = categoriesRes.data?.data || categoriesRes.data;
      const accountsData = accountsRes.data?.data || accountsRes.data;

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error.message);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setDataLoading(false);
    }
  };

  const frequencies = [
    { value: 'daily', label: 'Diário', icon: 'today' as const },
    { value: 'weekly', label: 'Semanal', icon: 'calendar' as const },
    { value: 'monthly', label: 'Mensal', icon: 'calendar-outline' as const },
    { value: 'yearly', label: 'Anual', icon: 'calendar-clear' as const },
  ];

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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
      
      await api.post('/recurring-transactions', {
        type: formData.type,
        description: formData.description,
        amount,
        categoryId: parseInt(formData.categoryId),
        accountId: parseInt(formData.accountId),
        frequency: formData.frequency,
        startDate: parseDate(formData.startDate),
      });
      
      Alert.alert('Sucesso', 'Transação recorrente criada!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Erro ao criar:', error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar transação');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Transação Recorrente</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tipo */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de Transação</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, formData.type === 'receita' && { backgroundColor: `${COLORS.success}20`, borderColor: COLORS.success }]}
              onPress={() => { handleInputChange('type', 'receita'); handleInputChange('categoryId', ''); }}
            >
              <Ionicons name="trending-up" size={24} color={formData.type === 'receita' ? COLORS.success : COLORS.textSecondary} />
              <Text style={[styles.typeText, formData.type === 'receita' && { color: COLORS.success }]}>Receita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, formData.type === 'despesa' && { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error }]}
              onPress={() => { handleInputChange('type', 'despesa'); handleInputChange('categoryId', ''); }}
            >
              <Ionicons name="trending-down" size={24} color={formData.type === 'despesa' ? COLORS.error : COLORS.textSecondary} />
              <Text style={[styles.typeText, formData.type === 'despesa' && { color: COLORS.error }]}>Despesa</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Dados Básicos */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Dados Básicos</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrição *</Text>
            <Input placeholder="Ex: Salário, Aluguel" value={formData.description} onChangeText={(v) => handleInputChange('description', v)} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Valor *</Text>
            <Input placeholder="0,00" value={formData.amount} onChangeText={(v) => handleInputChange('amount', formatAmountInput(v))} keyboardType="numeric" />
          </View>
        </Card>

        {/* Categoria */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Categoria</Text>
            <TouchableOpacity style={styles.addNewButton} onPress={() => navigation.navigate('AddCategory', { type: formData.type })}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Nova</Text>
            </TouchableOpacity>
          </View>
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma categoria disponível para {formData.type}</Text>
              <Button title="Criar Categoria" onPress={() => navigation.navigate('AddCategory', { type: formData.type })} variant="outline" size="sm" />
            </View>
          ) : (
            <View style={styles.optionsGrid}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.optionButton, formData.categoryId === cat.id.toString() && styles.optionButtonActive]}
                  onPress={() => handleInputChange('categoryId', cat.id.toString())}
                >
                  <Text style={[styles.optionText, formData.categoryId === cat.id.toString() && styles.optionTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Conta */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Conta</Text>
            <TouchableOpacity style={styles.addNewButton} onPress={() => navigation.navigate('AddAccount', {})}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Nova</Text>
            </TouchableOpacity>
          </View>
          {accounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma conta disponível</Text>
              <Button title="Criar Conta" onPress={() => navigation.navigate('AddAccount', {})} variant="outline" size="sm" />
            </View>
          ) : (
            <View style={styles.accountsContainer}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountButton, formData.accountId === acc.id.toString() && styles.accountButtonActive]}
                  onPress={() => handleInputChange('accountId', acc.id.toString())}
                >
                  <Ionicons name="wallet" size={20} color={formData.accountId === acc.id.toString() ? COLORS.primary : COLORS.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, formData.accountId === acc.id.toString() && { color: COLORS.primary }]}>{acc.name}</Text>
                    <Text style={styles.accountBalance}>{formatCurrency(parseFloat(acc.balance || '0'))}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Frequência */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Frequência</Text>
          <View style={styles.frequencyGrid}>
            {frequencies.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.frequencyButton, formData.frequency === f.value && styles.frequencyButtonActive]}
                onPress={() => handleInputChange('frequency', f.value)}
              >
                <Ionicons name={f.icon} size={20} color={formData.frequency === f.value ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.frequencyText, formData.frequency === f.value && { color: COLORS.primary }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Data */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Período</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Início *</Text>
            <Input placeholder="DD/MM/YYYY" value={formData.startDate} onChangeText={(v) => handleInputChange('startDate', formatDateInput(v))} keyboardType="numeric" />
          </View>
        </Card>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          <Button title="Cancelar" onPress={() => navigation.goBack()} variant="outline" />
          <Button title={loading ? "Criando..." : "Criar"} onPress={handleSubmit} variant="primary" loading={loading} disabled={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg },
  card: { marginBottom: SPACING.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  addNewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addNewText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  typeContainer: { flexDirection: 'row', gap: SPACING.md },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 2, borderColor: COLORS.border, gap: SPACING.sm },
  typeText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  inputGroup: { marginBottom: SPACING.md },
  inputLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: SPACING.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  optionButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  optionButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  optionTextActive: { color: 'white' },
  accountsContainer: { gap: SPACING.sm },
  accountButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  accountButtonActive: { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary },
  accountName: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  accountBalance: { fontSize: 12, color: COLORS.textSecondary },
  frequencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  frequencyButton: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  frequencyButtonActive: { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary },
  frequencyText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  buttonContainer: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
});
