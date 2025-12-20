import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';

interface Loan {
  id: number;
  borrowerName: string;
  amount: string;
  interestRate?: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
  createdAt: string;
  paidAt?: string;
  userId: number;
}

interface LoansScreenProps {
  navigation: any;
}

export const LoansScreen: React.FC<LoansScreenProps> = ({ navigation }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchLoans = async () => {
    try {
      // Simular dados de empréstimos
      const mockLoans: Loan[] = [
        {
          id: 1,
          borrowerName: 'João Silva',
          amount: '150000.00',
          interestRate: 5,
          dueDate: '2025-01-15T00:00:00Z',
          status: 'pending',
          description: 'Empréstimo para negócio',
          createdAt: '2024-11-15T10:00:00Z',
          userId: 1,
        },
        {
          id: 2,
          borrowerName: 'Maria Santos',
          amount: '75000.00',
          interestRate: 3,
          dueDate: '2024-12-10T00:00:00Z',
          status: 'overdue',
          description: 'Ajuda familiar',
          createdAt: '2024-10-10T14:30:00Z',
          userId: 1,
        },
        {
          id: 3,
          borrowerName: 'Pedro Costa',
          amount: '200000.00',
          interestRate: 8,
          dueDate: '2025-03-20T00:00:00Z',
          status: 'pending',
          description: 'Investimento em equipamentos',
          createdAt: '2024-12-01T09:15:00Z',
          userId: 1,
        },
        {
          id: 4,
          borrowerName: 'Ana Ferreira',
          amount: '50000.00',
          dueDate: '2024-11-30T00:00:00Z',
          status: 'paid',
          description: 'Empréstimo pessoal',
          createdAt: '2024-10-01T16:00:00Z',
          paidAt: '2024-11-28T10:30:00Z',
          userId: 1,
        },
      ];
      setLoans(mockLoans);
    } catch (error) {
      console.error('Erro ao carregar empréstimos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoans();
  };

  const getPendingLoans = () => loans.filter(loan => loan.status === 'pending');
  const getOverdueLoans = () => loans.filter(loan => loan.status === 'overdue');
  const getPaidLoans = () => loans.filter(loan => loan.status === 'paid');

  const getTotalLent = () => {
    return loans.reduce((total, loan) => {
      return total + parseFloat(loan.amount);
    }, 0);
  };

  const getTotalPending = () => {
    return [...getPendingLoans(), ...getOverdueLoans()].reduce((total, loan) => {
      return total + parseFloat(loan.amount);
    }, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return COLORS.success;
      case 'overdue':
        return COLORS.error;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Atrasado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return 'checkmark-circle';
      case 'overdue':
        return 'alert-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const calculateInterest = (loan: Loan) => {
    if (!loan.interestRate) return 0;
    const principal = parseFloat(loan.amount);
    const rate = loan.interestRate / 100;
    const monthsElapsed = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(loan.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return principal * rate * monthsElapsed;
  };

  const getTotalWithInterest = (loan: Loan) => {
    return parseFloat(loan.amount) + calculateInterest(loan);
  };

  const markAsPaid = (loanId: number) => {
    setLoans(prevLoans =>
      prevLoans.map(loan =>
        loan.id === loanId
          ? { ...loan, status: 'paid' as const, paidAt: new Date().toISOString() }
          : loan
      )
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando empréstimos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Empréstimos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddLoan')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Emprestado"
            value={formatCurrency(getTotalLent())}
            icon="cash"
            color={COLORS.primary}
          />
          <StatCard
            title="Pendente"
            value={formatCurrency(getTotalPending())}
            icon="time"
            color={COLORS.warning}
          />
        </View>

        {/* Resumo por Status */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.summaryLabel}>Pagos: {getPaidLoans().length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="time" size={16} color={COLORS.warning} />
                <Text style={styles.summaryLabel}>Pendentes: {getPendingLoans().length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.summaryLabel}>Atrasados: {getOverdueLoans().length}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Novo Empréstimo"
            onPress={() => navigation.navigate('AddLoan')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Lista de Empréstimos */}
        <View style={styles.loansList}>
          <Text style={styles.sectionTitle}>Empréstimos ({loans.length})</Text>
          
          {loans.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="cash" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhum empréstimo</Text>
              <Text style={styles.emptySubtitle}>
                Você ainda não registrou nenhum empréstimo
              </Text>
              <Button
                title="Registrar Primeiro Empréstimo"
                onPress={() => navigation.navigate('AddLoan')}
                variant="outline"
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            loans.map((loan) => {
              const statusColor = getStatusColor(loan.status);
              const totalWithInterest = getTotalWithInterest(loan);
              const interest = calculateInterest(loan);
              
              return (
                <Card key={loan.id} style={styles.loanCard}>
                  <View style={styles.loanHeader}>
                    <View style={styles.loanInfo}>
                      <Text style={styles.borrowerName}>{loan.borrowerName}</Text>
                      <Text style={styles.loanAmount}>
                        {formatCurrency(parseFloat(loan.amount))}
                        {interest > 0 && (
                          <Text style={styles.interestAmount}>
                            {' '}+ {formatCurrency(interest)} juros
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.totalAmount}>
                        Total: {formatCurrency(totalWithInterest)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons
                        name={getStatusIcon(loan.status)}
                        size={16}
                        color={statusColor}
                      />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(loan.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.loanDetails}>
                    {loan.description && (
                      <Text style={styles.loanDescription}>{loan.description}</Text>
                    )}
                    
                    <View style={styles.loanDates}>
                      <Text style={styles.dateLabel}>
                        📅 Vencimento: {formatDate(loan.dueDate)}
                      </Text>
                      <Text style={styles.dateLabel}>
                        📝 Criado: {formatRelativeDate(loan.createdAt)}
                      </Text>
                      {loan.paidAt && (
                        <Text style={styles.dateLabel}>
                          ✅ Pago: {formatRelativeDate(loan.paidAt)}
                        </Text>
                      )}
                    </View>

                    {loan.interestRate && (
                      <Text style={styles.interestRate}>
                        💰 Taxa de juros: {loan.interestRate}% ao mês
                      </Text>
                    )}
                  </View>

                  {loan.status !== 'paid' && (
                    <View style={styles.loanActions}>
                      <Button
                        title="Marcar como Pago"
                        onPress={() => markAsPaid(loan.id)}
                        variant="primary"
                        size="small"
                      />
                      <Button
                        title="Detalhes"
                        onPress={() => {}}
                        variant="outline"
                        size="small"
                      />
                    </View>
                  )}
                </Card>
              );
            })
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    padding: SPACING.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  loansList: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    marginTop: SPACING.sm,
  },
  loanCard: {
    marginBottom: SPACING.md,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  loanInfo: {
    flex: 1,
  },
  borrowerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  loanAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  interestAmount: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.warning,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loanDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  loanDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  loanDates: {
    gap: SPACING.xs,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  interestRate: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  loanActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});