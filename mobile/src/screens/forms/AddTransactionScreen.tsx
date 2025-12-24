import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { Account } from '../../types';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

const transactionSchema = z.object({
  amount: z.string().min(1, 'Valor é obrigatório'),
  description: z.string().optional(),
  accountId: z.number().min(1, 'Conta é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

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
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

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
        setValue('accountId', accountsList[0].id);
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

  const onSubmit = async (data: TransactionFormData) => {
    if (!selectedAccount || !selectedCategory) {
      Alert.alert('Erro', 'Por favor, selecione uma conta e categoria');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(data.amount.replace(',', '.'));
      
      await api.post('/transactions', {
        amount,
        type,
        category: selectedCategory,
        accountId: selectedAccount.id,
        description: data.description || '',
        date: new Date().toISOString(),
      });
      
      Alert.alert(
        'Sucesso!',
        `${type === 'receita' ? 'Receita' : 'Despesa'} registrada com sucesso`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Não foi possível registrar a transação';
      Alert.alert('Erro', errorMessage);
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Valor */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="0,00"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                style={styles.amountInput}
                error={errors.amount?.message}
              />
            )}
          />
        </Card>

        {/* Conta */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Conta</Text>
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
            <View style={styles.accountsList}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountItem,
                    selectedAccount?.id === account.id && styles.accountItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAccount(account);
                    setValue('accountId', account.id);
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categoria</Text>
            <TouchableOpacity style={styles.addNewButton} onPress={() => navigation.navigate('AddCategory', { type })}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Nova</Text>
            </TouchableOpacity>
          </View>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma categoria disponível</Text>
              <Button title="Criar Categoria" onPress={() => navigation.navigate('AddCategory', { type })} variant="outline" size="sm" />
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
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
                    setValue('category', category.name);
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
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Adicione uma descrição..."
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        {/* Botão de Salvar */}
        <View style={styles.saveContainer}>
          <Button
            title={`Registrar ${type === 'receita' ? 'Receita' : 'Despesa'}`}
            onPress={handleSubmit(onSubmit)}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
});