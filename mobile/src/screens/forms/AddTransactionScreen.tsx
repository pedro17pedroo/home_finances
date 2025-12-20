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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Account } from '../../types';
import { COLORS, SPACING } from '../../constants/config';

const transactionSchema = z.object({
  amount: z.string().min(1, 'Valor é obrigatório'),
  description: z.string().optional(),
  accountId: z.number().min(1, 'Conta é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionScreenProps {
  navigation: any;
  route: {
    params: {
      type: 'receita' | 'despesa';
    };
  };
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { type } = route.params;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const categories = {
    receita: [
      { id: 'salario', name: 'Salário', icon: 'briefcase' },
      { id: 'freelance', name: 'Freelance', icon: 'laptop' },
      { id: 'investimentos', name: 'Investimentos', icon: 'trending-up' },
      { id: 'vendas', name: 'Vendas', icon: 'storefront' },
      { id: 'outros', name: 'Outros', icon: 'ellipsis-horizontal' },
    ],
    despesa: [
      { id: 'alimentacao', name: 'Alimentação', icon: 'restaurant' },
      { id: 'transporte', name: 'Transporte', icon: 'car' },
      { id: 'moradia', name: 'Moradia', icon: 'home' },
      { id: 'saude', name: 'Saúde', icon: 'medical' },
      { id: 'lazer', name: 'Lazer', icon: 'game-controller' },
      { id: 'educacao', name: 'Educação', icon: 'school' },
      { id: 'outros', name: 'Outros', icon: 'ellipsis-horizontal' },
    ],
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      // Simular dados das contas
      const mockAccounts: Account[] = [
        {
          id: 1,
          name: 'Conta Corrente BAI',
          type: 'corrente',
          bank: 'Banco Angolano de Investimentos',
          balance: '150000.00',
          userId: 1,
        },
        {
          id: 2,
          name: 'Conta Poupança BFA',
          type: 'poupanca',
          bank: 'Banco de Fomento Angola',
          balance: '500000.00',
          userId: 1,
        },
      ];
      setAccounts(mockAccounts);
      if (mockAccounts.length > 0) {
        setSelectedAccount(mockAccounts[0]);
        setValue('accountId', mockAccounts[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    if (!selectedAccount || !selectedCategory) {
      Alert.alert('Erro', 'Por favor, selecione uma conta e categoria');
      return;
    }

    setLoading(true);
    try {
      // Simular criação da transação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível registrar a transação');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(value));
  };

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
          <Text style={styles.sectionTitle}>Conta</Text>
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
        </View>

        {/* Categoria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoria</Text>
          <View style={styles.categoriesGrid}>
            {categories[type].map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  setValue('category', category.id);
                }}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={
                    selectedCategory === category.id
                      ? 'white'
                      : COLORS.primary
                  }
                />
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            size="large"
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
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