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
import { Debt } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface DebtsScreenProps {
  navigation?: any;
}

export const DebtsScreen: React.FC<DebtsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDate();
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDebts = async () => {
    try {
      const response = await api.get('/debts');
      const data = response.data?.data?.debts || response.data?.data || response.data || [];
      setDebts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDebts();
  };

  const getPendingDebts = () => debts.filter(d => d.status === 'active' || d.status === 'pendente');
  const getOverdueDebts = () => debts.filter(d => d.status === 'overdue' || d.status === 'atrasado');
  const getPaidDebts = () => debts.filter(d => d.status === 'paid' || d.status === 'pago');

  const getTotalOwed = () => {
    return debts.reduce((total, debt) => total + parseFloat(debt.amount || debt.totalAmount || '0'), 0);
  };

  const getTotalPending = () => {
    return [...getPendingDebts(), ...getOverdueDebts()].reduce(
      (total, debt) => {
        const amount = parseFloat(debt.amount || debt.totalAmount || '0');
        const paid = parseFloat(debt.paidAmount || '0');
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
      default:
        return colors.textSecondary;
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
      default:
        return status;
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
      default:
        return 'help-circle';
    }
  };

  const handleMarkAsPaid = async (debt: Debt) => {
    Alert.alert(
      'Marcar como Pago',
      `Confirmar que pagou a dívida para "${debt.creditor}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const totalAmount = parseFloat(debt.amount || debt.totalAmount || '0');
              const paidAmount = parseFloat(debt.paidAmount || '0');
              const remainingAmount = totalAmount - paidAmount;
              await api.post(`/debts/${debt.id}/payment`, { amount: remainingAmount });
              showSuccess('Dívida marcada como paga');
              fetchDebts();
            } catch (error) {
              showError('Erro ao atualizar dívida');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      'Cancelar Dívida',
      `Tem certeza que deseja cancelar a dívida para "${debt.creditor}"?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/debts/${debt.id}/cancel`);
              showSuccess('Dívida cancelada');
              fetchDebts();
            } catch (error) {
              showError('Erro ao cancelar dívida');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Carregando dívidas..." />;
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
        <Text style={[styles.title, { color: colors.text }]}>Dívidas</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.error }]}
          onPress={() => navigation?.navigate('AddDebt', {})}
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
          <Card variant="elevated" padding="md" style={[styles.statCard, { backgroundColor: colors.error }]}>
            <Ionicons name="card" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Total em Dívidas</Text>
            <Text style={styles.statValue}>{formatCurrency(getTotalOwed())}</Text>
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
                Pagas: {getPaidDebts().length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={16} color={colors.warning} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Ativas: {getPendingDebts().length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Atrasadas: {getOverdueDebts().length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Lista de Dívidas */}
        {debts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dívidas ({debts.length})
            </Text>
            {debts.map((debt) => {
              const statusColor = getStatusColor(debt.status);
              const totalAmount = parseFloat(debt.amount || debt.totalAmount || '0');
              const paidAmount = parseFloat(debt.paidAmount || '0');
              const remainingAmount = totalAmount - paidAmount;
              const description = debt.description || debt.notes;
              
              return (
                <Card key={debt.id} variant="default" padding="md" style={styles.debtCard}>
                  <View style={styles.debtHeader}>
                    <View style={styles.debtInfo}>
                      <Text style={[styles.creditorName, { color: colors.text }]}>
                        {debt.creditor}
                      </Text>
                      <Text style={[styles.debtAmount, { color: colors.error }]}>
                        {formatCurrency(totalAmount)}
                      </Text>
                      {paidAmount > 0 && paidAmount < totalAmount && (
                        <Text style={[styles.remainingAmount, { color: colors.textSecondary }]}>
                          Restante: {formatCurrency(remainingAmount)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons name={getStatusIcon(debt.status)} size={14} color={statusColor} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(debt.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.debtDetails}>
                    {description && (
                      <Text style={[styles.debtDescription, { color: colors.textSecondary }]}>
                        {description}
                      </Text>
                    )}
                    <View style={styles.debtDates}>
                      {debt.createdAt && (
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                          📅 Início: {formatDate(debt.createdAt)}
                        </Text>
                      )}
                      {debt.dueDate && (
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                          ⏰ Vencimento: {formatDate(debt.dueDate)}
                        </Text>
                      )}
                      {debt.interestRate && (
                        <Text style={[styles.dateLabel, { color: colors.warning }]}>
                          💰 Juros: {debt.interestRate}% ao mês
                        </Text>
                      )}
                      {debt.minimumPayment && (
                        <Text style={[styles.dateLabel, { color: colors.primary }]}>
                          💳 Pagamento Mínimo: {formatCurrency(debt.minimumPayment)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {debt.status !== 'paid' && debt.status !== 'pago' && debt.status !== 'cancelado' && (
                    <View style={styles.debtActions}>
                      <Button
                        title="Marcar Pago"
                        onPress={() => handleMarkAsPaid(debt)}
                        size="sm"
                        icon="checkmark-circle-outline"
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Editar"
                        onPress={() => navigation?.navigate('AddDebt', { debt })}
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
            icon="card-outline"
            title="Nenhuma dívida"
            description="Você ainda não registrou nenhuma dívida"
            actionLabel="Registrar Dívida"
            onAction={() => navigation?.navigate('AddDebt', {})}
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
  debtCard: { marginBottom: SPACING.sm },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  debtInfo: { flex: 1 },
  creditorName: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.xs },
  debtAmount: { fontSize: 18, fontWeight: '700' },
  remainingAmount: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '500' },
  debtDetails: { marginBottom: SPACING.md },
  debtDescription: { fontSize: 13, fontStyle: 'italic', marginBottom: SPACING.sm },
  debtDates: { gap: 4 },
  dateLabel: { fontSize: 12 },
  debtActions: { flexDirection: 'row', gap: SPACING.sm },
});
