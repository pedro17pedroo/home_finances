import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, Button, Loading, EmptyState } from '../../components/ui';
import { Loan } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface LoansScreenProps {
  navigation?: any;
}

export const LoansScreen: React.FC<LoansScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDate();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoans = async () => {
    try {
      const response = await api.get('/loans');
      const data = response.data?.data?.loans || response.data?.data || response.data || [];
      setLoans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar empréstimos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoans();
  };

  const getPendingLoans = () => loans.filter(loan => loan.status === 'active' || loan.status === 'pendente');
  const getOverdueLoans = () => loans.filter(loan => loan.status === 'overdue' || loan.status === 'atrasado');
  const getPaidLoans = () => loans.filter(loan => loan.status === 'paid' || loan.status === 'pago');

  const getTotalLent = () => {
    return loans.reduce((total, loan) => total + parseFloat(loan.amount || '0'), 0);
  };

  const getTotalPending = () => {
    return [...getPendingLoans(), ...getOverdueLoans()].reduce(
      (total, loan) => {
        const amount = parseFloat(loan.amount || '0');
        const paid = parseFloat(loan.paidAmount || '0');
        return total + (amount - paid);
      },
      0
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'pago':
        return colors.success;
      case 'overdue':
      case 'atrasado':
        return colors.error;
      case 'active':
      case 'pendente':
        return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
      case 'pago':
        return 'Pago';
      case 'overdue':
      case 'atrasado':
        return 'Atrasado';
      case 'active':
      case 'pendente':
        return 'Ativo';
      default: return status;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'paid':
      case 'pago':
        return 'checkmark-circle';
      case 'overdue':
      case 'atrasado':
        return 'alert-circle';
      case 'active':
      case 'pendente':
        return 'time';
      default: return 'help-circle';
    }
  };

  const handleMarkAsPaid = async (loan: Loan) => {
    const borrowerName = loan.borrower || loan.personName || 'Devedor';
    Alert.alert(
      'Marcar como Pago',
      `Confirmar que "${borrowerName}" pagou o empréstimo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const remainingAmount = parseFloat(loan.amount) - parseFloat(loan.paidAmount || '0');
              await api.post(`/loans/${loan.id}/payment`, { amount: remainingAmount });
              showSuccess('Empréstimo marcado como pago');
              fetchLoans();
            } catch (error) {
              showError('Erro ao atualizar empréstimo');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Carregando empréstimos..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Empréstimos</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation?.navigate('AddLoan', {})}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Estatísticas */}
        <View style={styles.statsRow}>
          <Card variant="elevated" padding="md" style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="cash" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Total Emprestado</Text>
            <Text style={styles.statValue}>{formatCurrency(getTotalLent())}</Text>
          </Card>
          <Card variant="elevated" padding="md" style={[styles.statCard, { backgroundColor: colors.warning }]}>
            <Ionicons name="time" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Pendente</Text>
            <Text style={styles.statValue}>{formatCurrency(getTotalPending())}</Text>
          </Card>
        </View>

        {/* Resumo */}
        <Card variant="default" padding="md" style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumo</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Pagos: {getPaidLoans().length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={16} color={colors.warning} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Ativos: {getPendingLoans().length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Atrasados: {getOverdueLoans().length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Lista de Empréstimos */}
        {loans.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Empréstimos ({loans.length})
            </Text>
            {loans.map((loan) => {
              const statusColor = getStatusColor(loan.status);
              const borrowerName = loan.borrower || loan.personName || 'Devedor';
              const paidAmount = parseFloat(loan.paidAmount || '0');
              const totalAmount = parseFloat(loan.amount || '0');
              const remainingAmount = totalAmount - paidAmount;
              const description = loan.description || loan.notes;
              
              return (
                <Card key={loan.id} variant="default" padding="md" style={styles.loanCard}>
                  <View style={styles.loanHeader}>
                    <View style={styles.loanInfo}>
                      <Text style={[styles.personName, { color: colors.text }]}>
                        {borrowerName}
                      </Text>
                      <Text style={[styles.loanAmount, { color: colors.primary }]}>
                        {formatCurrency(loan.amount)}
                      </Text>
                      {paidAmount > 0 && paidAmount < totalAmount && (
                        <Text style={[styles.remainingAmount, { color: colors.textSecondary }]}>
                          Restante: {formatCurrency(remainingAmount)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons name={getStatusIcon(loan.status)} size={14} color={statusColor} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(loan.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.loanDetails}>
                    {description && (
                      <Text style={[styles.loanDescription, { color: colors.textSecondary }]}>
                        {description}
                      </Text>
                    )}
                    <View style={styles.loanDates}>
                      {loan.createdAt && (
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                          📅 Início: {formatDate(loan.createdAt)}
                        </Text>
                      )}
                      {loan.dueDate && (
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                          ⏰ Vencimento: {formatDate(loan.dueDate)}
                        </Text>
                      )}
                      {loan.interestRate && (
                        <Text style={[styles.dateLabel, { color: colors.warning }]}>
                          💰 Juros: {loan.interestRate}% ao mês
                        </Text>
                      )}
                    </View>
                  </View>

                  {loan.status !== 'paid' && loan.status !== 'pago' && loan.status !== 'cancelado' && (
                    <View style={styles.loanActions}>
                      <Button
                        title="Marcar Pago"
                        onPress={() => handleMarkAsPaid(loan)}
                        size="sm"
                        icon="checkmark-circle-outline"
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Editar"
                        onPress={() => navigation?.navigate('AddLoan', { loan })}
                        variant="outline"
                        size="sm"
                        icon="pencil-outline"
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="cash-outline"
            title="Nenhum empréstimo"
            description="Você ainda não registrou nenhum empréstimo"
            actionLabel="Registrar Empréstimo"
            onAction={() => navigation?.navigate('AddLoan', {})}
          />
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '600' },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  statValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  summaryCard: { marginBottom: SPACING.lg },
  summaryTitle: { fontSize: 14, fontWeight: '600', marginBottom: SPACING.sm },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 12 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
  loanCard: { marginBottom: SPACING.sm },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  loanInfo: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.xs },
  loanAmount: { fontSize: 18, fontWeight: '700' },
  remainingAmount: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '500' },
  loanDetails: { marginBottom: SPACING.md },
  loanDescription: { fontSize: 13, fontStyle: 'italic', marginBottom: SPACING.sm },
  loanDates: { gap: 4 },
  dateLabel: { fontSize: 12 },
  loanActions: { flexDirection: 'row', gap: SPACING.sm },
});
