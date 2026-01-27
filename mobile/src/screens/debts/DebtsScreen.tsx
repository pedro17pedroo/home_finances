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
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

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

  const openReminderModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setCustomMessage('');
    setUseCustomMessage(false);
    setReminderModalVisible(true);
  };

  const closeReminderModal = () => {
    setReminderModalVisible(false);
    setSelectedDebt(null);
    setCustomMessage('');
    setUseCustomMessage(false);
  };

  const handleSendReminder = async () => {
    if (!selectedDebt) return;

    if (useCustomMessage && !customMessage.trim()) {
      showError('Digite uma mensagem personalizada');
      return;
    }

    setSendingReminder(true);
    try {
      const data = useCustomMessage && customMessage.trim()
        ? { customMessage: customMessage.trim() }
        : {};
      
      await api.post(`/debts/${selectedDebt.id}/send-reminder`, data);
      showSuccess('Lembrete enviado com sucesso!');
      closeReminderModal();
    } catch (error: any) {
      console.error('Erro ao enviar lembrete:', error);
      showError(error.response?.data?.message || 'Erro ao enviar lembrete');
    } finally {
      setSendingReminder(false);
    }
  };

  const canSendReminder = (debt: Debt) => {
    // Pode enviar lembrete se tiver email ou telefone
    const hasContact = (debt as any).creditorEmail || (debt as any).creditorPhone;
    const isActive = debt.status === 'active' || debt.status === 'pendente' || debt.status === 'overdue' || debt.status === 'atrasado';
    return hasContact && isActive;
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
                      {canSendReminder(debt) && (
                        <Button
                          title="Lembrete"
                          onPress={() => openReminderModal(debt)}
                          variant="outline"
                          size="sm"
                          icon="notifications-outline"
                          style={{ flex: 1 }}
                        />
                      )}
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
              {selectedDebt && (
                <>
                  <View style={[styles.infoBox, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
                    <Ionicons name="information-circle" size={20} color={colors.info} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        <Text style={styles.infoBold}>Credor:</Text> {selectedDebt.creditor}
                      </Text>
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        <Text style={styles.infoBold}>Valor:</Text> {formatCurrency(selectedDebt.amount || selectedDebt.totalAmount)}
                      </Text>
                      {(selectedDebt as any).creditorEmail && (
                        <Text style={[styles.infoText, { color: colors.text }]}>
                          <Text style={styles.infoBold}>Email:</Text> {(selectedDebt as any).creditorEmail}
                        </Text>
                      )}
                      {(selectedDebt as any).creditorPhone && (
                        <Text style={[styles.infoText, { color: colors.text }]}>
                          <Text style={styles.infoBold}>Telefone:</Text> {(selectedDebt as any).creditorPhone}
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
                          Enviar lembrete automático com informações da dívida
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
                      O lembrete será enviado para os canais de notificação configurados na dívida
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
