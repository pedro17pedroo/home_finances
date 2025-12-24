import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface TransactionDetailsScreenProps {
  navigation: any;
  route: any;
}

export const TransactionDetailsScreen: React.FC<TransactionDetailsScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { colors } = useTheme();
  const { transaction } = route.params || {};
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      if (transaction?.accountId) {
        const response = await api.get(`/accounts/${transaction.accountId}`);
        const data = response.data?.data || response.data;
        setAccountInfo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-AO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-AO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    return type === 'receita' ? 'trending-up' : 'trending-down';
  };

  const getTransactionColor = (type: string) => {
    return type === 'receita' ? COLORS.success : COLORS.error;
  };

  const getCategoryName = () => {
    if (typeof transaction?.category === 'object') {
      return transaction.category?.name || 'Sem categoria';
    }
    return transaction?.category || 'Sem categoria';
  };

  // Calcular saldo antes e depois
  const transactionAmount = parseFloat(transaction?.amount || '0');
  const currentBalance = parseFloat(accountInfo?.balance || '0');
  
  // Se for receita, o saldo antes era menor; se for despesa, era maior
  const balanceBefore = transaction?.type === 'receita' 
    ? currentBalance - transactionAmount 
    : currentBalance + transactionAmount;
  const balanceAfter = currentBalance;

  if (loading) {
    return <Loading message="Carregando detalhes..." />;
  }

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 50 }}>
          Transação não encontrada
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Detalhes</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Valor Principal */}
        <Card 
          variant="elevated" 
          padding="lg" 
          style={{
            ...styles.amountCard,
            backgroundColor: getTransactionColor(transaction.type),
          }}
        >
          <View style={styles.amountHeader}>
            <View style={styles.amountIconContainer}>
              <Ionicons
                name={getTransactionIcon(transaction.type)}
                size={32}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.amountType}>
              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
            </Text>
          </View>
          <Text style={styles.amountValue}>
            {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <Text style={styles.amountCategory}>{getCategoryName()}</Text>
        </Card>

        {/* Informações da Transação */}
        <Card variant="default" padding="md" style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações da Transação
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Data</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(transaction.date)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Hora</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTime(transaction.createdAt || transaction.date)}
                </Text>
              </View>
            </View>
          </View>

          {transaction.description && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Descrição</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {transaction.description}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Informações da Conta */}
        {accountInfo && (
          <Card variant="default" padding="md" style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Conta Associada
            </Text>

            <View style={styles.accountInfoContainer}>
              <View style={[styles.accountIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons 
                  name={accountInfo.type === 'poupanca' ? 'library' : 'card'} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.accountDetails}>
                <Text style={[styles.accountName, { color: colors.text }]}>
                  {accountInfo.name}
                </Text>
                {accountInfo.bank && (
                  <Text style={[styles.accountBank, { color: colors.textSecondary }]}>
                    {accountInfo.bank}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Impacto no Saldo */}
        <Card variant="default" padding="md" style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Impacto no Saldo
          </Text>

          <View style={styles.balanceImpact}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                Saldo Antes
              </Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {formatCurrency(balanceBefore)}
              </Text>
            </View>

            <View style={styles.balanceArrow}>
              <Ionicons 
                name={transaction.type === 'receita' ? 'add-circle' : 'remove-circle'} 
                size={24} 
                color={getTransactionColor(transaction.type)} 
              />
              <Text style={[styles.balanceChange, { color: getTransactionColor(transaction.type) }]}>
                {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(transactionAmount)}
              </Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                Saldo Depois
              </Text>
              <Text style={[styles.balanceValueFinal, { color: colors.primary }]}>
                {formatCurrency(balanceAfter)}
              </Text>
            </View>
          </View>
        </Card>

        {/* ID da Transação */}
        <View style={styles.transactionId}>
          <Text style={[styles.transactionIdLabel, { color: colors.textTertiary }]}>
            ID da Transação: #{transaction.id}
          </Text>
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  amountCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  amountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  amountType: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  amountCategory: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  infoRow: {
    marginBottom: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountBank: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceImpact: {
    gap: SPACING.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  balanceChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionId: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  transactionIdLabel: {
    fontSize: 12,
  },
});
