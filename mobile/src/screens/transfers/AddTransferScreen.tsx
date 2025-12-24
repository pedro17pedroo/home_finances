import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Account } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

const transferSchema = z.object({
  amount: z.string().min(1, 'Valor é obrigatório'),
  description: z.string().optional(),
  fromAccountId: z.number().min(1, 'Conta de origem é obrigatória'),
  toAccountId: z.number().min(1, 'Conta de destino é obrigatória'),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: 'Conta de origem deve ser diferente da conta de destino',
  path: ['toAccountId'],
});

type TransferFormData = z.infer<typeof transferSchema>;

interface AddTransferScreenProps {
  navigation: any;
  route?: any;
}

export const AddTransferScreen: React.FC<AddTransferScreenProps> = ({ navigation, route }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const { formatCurrency, parseCurrency } = useCurrency();
  
  const fromAccountId = route?.params?.fromAccountId;

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

  const watchAmount = watch('amount');

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await api.get('/accounts');
      const data = response.data?.data || response.data;
      const accountsList = Array.isArray(data) ? data : [];
      setAccounts(accountsList);
      
      // Se veio com fromAccountId, pré-selecionar a conta de origem
      if (fromAccountId && accountsList.length > 0) {
        const preselectedAccount = accountsList.find((acc: Account) => acc.id === fromAccountId);
        if (preselectedAccount) {
          setFromAccount(preselectedAccount);
          setValue('fromAccountId', preselectedAccount.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, [fromAccountId])
  );

  const onSubmit = async (data: TransferFormData) => {
    if (!fromAccount || !toAccount) {
      Alert.alert('Erro', 'Por favor, selecione as contas de origem e destino');
      return;
    }

    const amount = parseCurrency(data.amount);
    const fromBalance = parseFloat(fromAccount.balance);

    if (amount > fromBalance) {
      Alert.alert(
        'Saldo Insuficiente',
        `Saldo disponível: ${formatCurrency(fromBalance)}\nValor solicitado: ${formatCurrency(amount)}`
      );
      return;
    }

    setLoading(true);
    try {
      await api.post('/transfers', {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: amount,
        description: data.description || '',
      });
      
      Alert.alert(
        'Transferência Realizada!',
        `${formatCurrency(amount)} transferido de ${fromAccount.name} para ${toAccount.name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Não foi possível realizar a transferência';
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableToAccounts = () => {
    return accounts.filter(account => account.id !== fromAccount?.id);
  };

  const getAccountIcon = (type: string) => {
    return type === 'poupanca' ? 'library' : 'card';
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
        <Text style={styles.title}>Nova Transferência</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Valor */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor da Transferência</Text>
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
          {watchAmount && (
            <Text style={styles.amountPreview}>
              {formatCurrency(parseCurrency(watchAmount))}
            </Text>
          )}
        </Card>

        {/* Conta de Origem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta de Origem</Text>
          <View style={styles.accountsList}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  fromAccount?.id === account.id && styles.accountItemSelected,
                ]}
                onPress={() => {
                  setFromAccount(account);
                  setValue('fromAccountId', account.id);
                  // Reset conta de destino se for a mesma
                  if (toAccount?.id === account.id) {
                    setToAccount(null);
                    setValue('toAccountId', 0);
                  }
                }}
              >
                <View style={styles.accountInfo}>
                  <Ionicons
                    name={getAccountIcon(account.type)}
                    size={20}
                    color={
                      fromAccount?.id === account.id
                        ? COLORS.primary
                        : COLORS.textSecondary
                    }
                  />
                  <View style={styles.accountDetails}>
                    <Text
                      style={[
                        styles.accountName,
                        fromAccount?.id === account.id && styles.accountNameSelected,
                      ]}
                    >
                      {account.name}
                    </Text>
                    <Text style={styles.accountBalance}>
                      Saldo: {formatCurrency(parseFloat(account.balance))}
                    </Text>
                  </View>
                </View>
                {fromAccount?.id === account.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conta de Destino */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta de Destino</Text>
          {!fromAccount ? (
            <Card style={styles.disabledCard}>
              <Text style={styles.disabledText}>
                Selecione primeiro a conta de origem
              </Text>
            </Card>
          ) : (
            <View style={styles.accountsList}>
              {getAvailableToAccounts().map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountItem,
                    toAccount?.id === account.id && styles.accountItemSelected,
                  ]}
                  onPress={() => {
                    setToAccount(account);
                    setValue('toAccountId', account.id);
                  }}
                >
                  <View style={styles.accountInfo}>
                    <Ionicons
                      name={getAccountIcon(account.type)}
                      size={20}
                      color={
                        toAccount?.id === account.id
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                    <View style={styles.accountDetails}>
                      <Text
                        style={[
                          styles.accountName,
                          toAccount?.id === account.id && styles.accountNameSelected,
                        ]}
                      >
                        {account.name}
                      </Text>
                      <Text style={styles.accountBalance}>
                        Saldo: {formatCurrency(parseFloat(account.balance))}
                      </Text>
                    </View>
                  </View>
                  {toAccount?.id === account.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Resumo da Transferência */}
        {fromAccount && toAccount && watchAmount && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo da Transferência</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>De:</Text>
              <Text style={styles.summaryValue}>{fromAccount.name}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Para:</Text>
              <Text style={styles.summaryValue}>{toAccount.name}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valor:</Text>
              <Text style={[styles.summaryValue, styles.summaryAmount]}>
                {formatCurrency(parseCurrency(watchAmount))}
              </Text>
            </View>
          </Card>
        )}

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição (Opcional)</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Motivo da transferência..."
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        {/* Botão de Transferir */}
        <View style={styles.transferContainer}>
          <Button
            title="Realizar Transferência"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
            disabled={!fromAccount || !toAccount || !watchAmount}
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
  amountPreview: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: SPACING.sm,
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
  disabledCard: {
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  disabledText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.primary}05`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  transferContainer: {
    padding: SPACING.lg,
  },
});