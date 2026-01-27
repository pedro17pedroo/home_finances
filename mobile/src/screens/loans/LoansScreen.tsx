import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
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
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

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

  const openReminderModal = (loan: Loan) => {
    setSelectedLoan(loan);
    setCustomMessage('');
    setUseCustomMessage(false);
    setReminderModalVisible(true);
  };

  const closeReminderModal = () => {
    setReminderModalVisible(false);
    setSelectedLoan(null);
    setCustomMessage('');
    setUseCustomMessage(false);
  };

  const handleSendReminder = async () => {
    if (!selectedLoan) return;

    if (useCustomMessage && !customMessage.trim()) {
      showError('Digite uma mensagem personalizada');
      return;
    }

    setSendingReminder(true);
    try {
      const data = useCustomMessage && customMessage.trim()
        ? { customMessage: customMessage.trim() }
        : {};
      
      await api.post(`/loans/${selectedLoan.id}/send-reminder`, data);
      showSuccess('Lembrete enviado com sucesso!');
      closeReminderModal();
    } catch (error: any) {
      console.error('Erro ao enviar lembrete:', error);
      showError(error.response?.data?.message || 'Erro ao enviar lembrete');
    } finally {
      setSendingReminder(false);
    }
  };

  const canSendReminder = (loan: Loan) => {
    // Pode enviar lembrete se tiver email ou telefone
    const hasContact = (loan as any).borrowerEmail || (loan as any).borrowerPhone;
    const isActive = loan.status === 'active' || loan.status === 'pendente' || loan.status === 'overdue' || loan.status === 'atrasado';
    return hasContact && isActive;
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
                      {canSendReminder(loan) && (
                        <Button
                          title="Lembrete"
                          onPress={() => openReminderModal(loan)}
                          variant="outline"
                          size="sm"
                          icon="notifications-outline"
                          style={{ flex: 1 }}
                        />
                      )}
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

      {/* Modal de Enviar Lembrete */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReminderModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="notifications" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Enviar Lembrete de Pagamento
                </Text>
              </View>
              <TouchableOpacity onPress={closeReminderModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedLoan && (
                <>
                  <View style={[styles.infoBox, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
                    <Ionicons name="information-circle" size={20} color={colors.info} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        <Text style={styles.infoBold}>Devedor:</Text> {selectedLoan.borrower || selectedLoan.personName}
                      </Text>
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        <Text style={styles.infoBold}>Valor:</Text> {formatCurrency(selectedLoan.amount)}
                      </Text>
                      {(selectedLoan as any).borrowerEmail && (
                        <Text style={[styles.infoText, { color: colors.text }]}>
                          <Text style={styles.infoBold}>Email:</Text> {(selectedLoan as any).borrowerEmail}
                        </Text>
                      )}
                      {(selectedLoan as any).borrowerPhone && (
                        <Text style={[styles.infoText, { color: colors.text }]}>
                          <Text style={styles.infoBold}>Telefone:</Text> {(selectedLoan as any).borrowerPhone}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.messageTypeContainer}>
                    <TouchableOpacity
                      style={styles.messageTypeOption}
                      onPress={() => setUseCustomMessage(false)}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: colors.border },
                          !useCustomMessage && { borderColor: colors.primary },
                        ]}
                      >
                        {!useCustomMessage && (
                          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      <View style={styles.messageTypeText}>
                        <Text style={[styles.messageTypeTitle, { color: colors.text }]}>
                          Mensagem Padrão
                        </Text>
                        <Text style={[styles.messageTypeDescription, { color: colors.textSecondary }]}>
                          Enviar lembrete automático com informações do empréstimo
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageTypeOption}
                      onPress={() => setUseCustomMessage(true)}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: colors.border },
                          useCustomMessage && { borderColor: colors.primary },
                        ]}
                      >
                        {useCustomMessage && (
                          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      <View style={styles.messageTypeText}>
                        <Text style={[styles.messageTypeTitle, { color: colors.text }]}>
                          Mensagem Personalizada
                        </Text>
                        <Text style={[styles.messageTypeDescription, { color: colors.textSecondary }]}>
                          Escrever sua própria mensagem
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {useCustomMessage && (
                    <View style={styles.customMessageContainer}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        Sua Mensagem
                      </Text>
                      <TextInput
                        style={[
                          styles.textArea,
                          {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.border,
                          },
                        ]}
                        value={customMessage}
                        onChangeText={setCustomMessage}
                        placeholder="Digite sua mensagem personalizada..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  )}

                  <View style={[styles.warningBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.warning} />
                    <Text style={[styles.warningText, { color: colors.text }]}>
                      O lembrete será enviado para os canais de notificação configurados no empréstimo
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                onPress={closeReminderModal}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title={sendingReminder ? 'Enviando...' : 'Enviar Lembrete'}
                onPress={handleSendReminder}
                disabled={sendingReminder}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  infoBold: {
    fontWeight: '600',
  },
  messageTypeContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  messageTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageTypeText: {
    flex: 1,
  },
  messageTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageTypeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  customMessageContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: 14,
    minHeight: 100,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
