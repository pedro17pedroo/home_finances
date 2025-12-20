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

interface Debt {
  id: number;
  creditorName: string;
  amount: string;
  interestRate?: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
  createdAt: string;
  paidAt?: string;
  userId: number;
}

interface DebtsScreenProps {
  navigation: any;
}

export const DebtsScreen: React.FC<DebtsScreenProps> = ({ navigation }) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchDebts = async () => {
    try {
      // Simular dados de dívidas
      const mockDebts: Debt[] = [
        {
          id: 1,
          creditorName: 'Banco BAI',
          amount: '250000.00',
          interestRate: 12,
          dueDate: '2025-01-20T00:00:00Z',
          status: 'pending',
          description: 'Empréstimo pessoal',
          createdAt: '2024-10-20T10:00:00Z',
          userId: 1,
        },
        {
          id: 2,
          creditorName: 'Cartão de Crédito BFA',
          amount: '85000.00',
          interestRate: 15,
          dueDate: '2024-12-15T00:00:00Z',
          status: 'overdue',
          description: 'Fatura do cartão',
          createdAt: '2024-11-15T14:30:00Z',
          userId: 1,
        },
        {
          id: 3,
          creditorName: 'Loja de Móveis',
          amount: '120000.00',
          dueDate: '2025-02-10T00:00:00Z',
          status: 'pending',
          description: 'Financiamento de móveis',
          createdAt: '2024-12-01T09:15:00Z',
          userId: 1,
        },
        {
          id: 4,
          creditorName: 'Empréstimo Familiar',
          amount: '75000.00',
          dueDate: '2024-11-25T00:00:00Z',
          status: 'paid',
          description: 'Ajuda da família',
          createdAt: '2024-09-25T16:00:00Z',
          paidAt: '2024-11-20T10:30:00Z',
          userId: 1,
        },
      ];
      setDebts(mockDebts);
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDebts();
  };

  const getPendingDebts = () => debts.filter(debt => debt.status === 'pending');
  const getOverdueDebts = () => debts.filter(debt => debt.status === 'overdue');
  const getPaidDebts = () => debts.filter(debt => debt.status === 'paid');

  const getTotalDebt = () => {
    return [...getPendingDebts(), ...getOverdueDebts()].reduce((total, debt) => {
      return total + parseFloat(debt.amount);
    }, 0);
  };

  const getTotalPaid = () => {
    return getPaidDebts().reduce((total, debt) => {
      return total + parseFloat(debt.amount);
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

  const calculateInterest = (debt: Debt) => {
    if (!debt.interestRate) return 0;
    const principal = parseFloat(debt.amount);
    const rate = debt.interestRate / 100;
    const monthsElapsed = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(debt.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return principal * rate * monthsElapsed;
  };

  const getTotalWithInterest = (debt: Debt) => {
    return parseFloat(debt.amount) + calculateInterest(debt);
  };

  const markAsPaid = (debtId: number) => {
    setDebts(prevDebts =>
      prevDebts.map(debt =>
        debt.id === debtId
          ? { ...debt, status: 'paid' as const, paidAt: new Date().toISOString() }
          : debt
      )
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyLevel = (debt: Debt) => {
    if (debt.status === 'paid') return 'paid';
    if (debt.status === 'overdue') return 'overdue';
    
    const daysUntilDue = getDaysUntilDue(debt.dueDate);
    if (daysUntilDue <= 3) return 'urgent';
    if (daysUntilDue <= 7) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return COLORS.error;
      case 'urgent':
        return '#FF6B35';
      case 'warning':
        return COLORS.warning;
      case 'paid':
        return COLORS.success;
      default:
        return COLORS.primary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando dívidas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dívidas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDebt')}
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
            title="Total em Dívidas"
            value={formatCurrency(getTotalDebt())}
            icon="card"
            color={COLORS.error}
          />
          <StatCard
            title="Total Pago"
            value={formatCurrency(getTotalPaid())}
            icon="checkmark-circle"
            color={COLORS.success}
          />
        </View>

        {/* Resumo por Status */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.summaryLabel}>Pagas: {getPaidDebts().length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="time" size={16} color={COLORS.warning} />
                <Text style={styles.summaryLabel}>Pendentes: {getPendingDebts().length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.summaryLabel}>Atrasadas: {getOverdueDebts().length}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Alerta de Dívidas Urgentes */}
        {debts.filter(debt => ['urgent', 'overdue'].includes(getUrgencyLevel(debt))).length > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={20} color={COLORS.error} />
              <Text style={styles.alertTitle}>Atenção!</Text>
            </View>
            <Text style={styles.alertText}>
              Você tem {debts.filter(debt => ['urgent', 'overdue'].includes(getUrgencyLevel(debt))).length} dívida(s) 
              que precisam de atenção urgente.
            </Text>
          </Card>
        )}

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Nova Dívida"
            onPress={() => navigation.navigate('AddDebt')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Lista de Dívidas */}
        <View style={styles.debtsList}>
          <Text style={styles.sectionTitle}>Dívidas ({debts.length})</Text>
          
          {debts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="card" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma dívida</Text>
              <Text style={styles.emptySubtitle}>
                Você não tem dívidas registradas
              </Text>
              <Button
                title="Registrar Primeira Dívida"
                onPress={() => navigation.navigate('AddDebt')}
                variant="outline"
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            debts
              .sort((a, b) => {
                // Ordenar por urgência: overdue > urgent > warning > normal > paid
                const urgencyOrder = { overdue: 0, urgent: 1, warning: 2, normal: 3, paid: 4 };
                const aUrgency = getUrgencyLevel(a);
                const bUrgency = getUrgencyLevel(b);
                return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
              })
              .map((debt) => {
                const statusColor = getStatusColor(debt.status);
                const urgency = getUrgencyLevel(debt);
                const urgencyColor = getUrgencyColor(urgency);
                const totalWithInterest = getTotalWithInterest(debt);
                const interest = calculateInterest(debt);
                const daysUntilDue = getDaysUntilDue(debt.dueDate);
                
                return (
                  <Card 
                    key={debt.id} 
                    style={[
                      styles.debtCard,
                      urgency === 'overdue' && styles.overdueCard,
                      urgency === 'urgent' && styles.urgentCard,
                    ]}
                  >
                    <View style={styles.debtHeader}>
                      <View style={styles.debtInfo}>
                        <Text style={styles.creditorName}>{debt.creditorName}</Text>
                        <Text style={styles.debtAmount}>
                          {formatCurrency(parseFloat(debt.amount))}
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
                          name={getStatusIcon(debt.status)}
                          size={16}
                          color={statusColor}
                        />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {getStatusText(debt.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.debtDetails}>
                      {debt.description && (
                        <Text style={styles.debtDescription}>{debt.description}</Text>
                      )}
                      
                      <View style={styles.debtDates}>
                        <Text style={[
                          styles.dateLabel,
                          { color: urgencyColor }
                        ]}>
                          📅 Vencimento: {formatDate(debt.dueDate)}
                          {debt.status !== 'paid' && (
                            <Text style={styles.daysLabel}>
                              {daysUntilDue > 0 
                                ? ` (${daysUntilDue} dias)`
                                : ` (${Math.abs(daysUntilDue)} dias atrasado)`
                              }
                            </Text>
                          )}
                        </Text>
                        <Text style={styles.dateLabel}>
                          📝 Criado: {formatRelativeDate(debt.createdAt)}
                        </Text>
                        {debt.paidAt && (
                          <Text style={styles.dateLabel}>
                            ✅ Pago: {formatRelativeDate(debt.paidAt)}
                          </Text>
                        )}
                      </View>

                      {debt.interestRate && (
                        <Text style={styles.interestRate}>
                          💰 Taxa de juros: {debt.interestRate}% ao mês
                        </Text>
                      )}
                    </View>

                    {debt.status !== 'paid' && (
                      <View style={styles.debtActions}>
                        <Button
                          title="Marcar como Pago"
                          onPress={() => markAsPaid(debt.id)}
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
  alertCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  alertText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  debtsList: {
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
  debtCard: {
    marginBottom: SPACING.md,
  },
  overdueCard: {
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  urgentCard: {
    backgroundColor: '#FF6B3505',
    borderColor: '#FF6B35',
    borderWidth: 1,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  debtInfo: {
    flex: 1,
  },
  creditorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.error,
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
  debtDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  debtDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  debtDates: {
    gap: SPACING.xs,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  daysLabel: {
    fontWeight: '500',
  },
  interestRate: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  debtActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});