import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import recurringTransactionsService from '../../services/recurring-transactions.service';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { SPACING } from '../../constants/config';

interface ExecutionHistory {
  id: number;
  recurringTransactionId: number;
  transactionId: number | null;
  scheduledDate: string;
  executedDate: string | null;
  status: 'completed' | 'failed' | 'pending';
  amount: string;
  accountBalanceBefore: string | null;
  accountBalanceAfter: string | null;
  errorMessage: string | null;
  transactionDescription: string | null;
  createdAt: string;
}

export function RecurringTransactionHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { id, description } = (route.params as any) || {};

  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await recurringTransactionsService.getExecutionHistory(id);
      setHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Data inválida';
      
      return dateObj.toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return 'Data não disponível';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Data inválida';
      
      return dateObj.toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const formatTime = (date: string | null | undefined) => {
    if (!date) return '--:--';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '--:--';
      
      return dateObj.toLocaleTimeString('pt-AO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '--:--';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(parseFloat(amount));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'failed':
        return 'Falhou';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>Histórico</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {description}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nenhuma execução registrada"
            description="Esta transação recorrente ainda não foi executada"
          />
        ) : (
          <>
            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Sobre as Execuções</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Cada execução bem-sucedida gera uma transação real na sua conta, afetando o saldo disponível. 
                  Execuções falhadas não geram transações.
                </Text>
              </View>
            </View>

            {/* Resumo */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="stats-chart" size={20} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Resumo Geral</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {history.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Total de Execuções
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {history.filter(h => h.status === 'completed').length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Bem-sucedidas
                  </Text>
                </View>
              </View>
              {history.filter(h => h.status === 'failed').length > 0 && (
                <View style={[styles.summaryAlert, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.summaryAlertText, { color: colors.error }]}>
                    {history.filter(h => h.status === 'failed').length} execução(ões) falharam
                  </Text>
                </View>
              )}
            </View>

            {/* Lista de Execuções */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Execuções ({history.length})
            </Text>

            {history.map((item) => {
              const statusColor = getStatusColor(item.status);
              const statusIcon = getStatusIcon(item.status);
              const statusLabel = getStatusLabel(item.status);

              return (
                <View
                  key={item.id}
                  style={[styles.historyCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.historyHeader}>
                    <View style={[styles.historyIconContainer, { backgroundColor: statusColor + '20' }]}>
                      <Ionicons
                        name={statusIcon}
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <View style={styles.historyTopRow}>
                        <View style={styles.historyMainInfo}>
                          <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                              <Text style={[styles.statusText, { color: statusColor }]}>
                                {statusLabel}
                              </Text>
                            </View>
                            <Text style={[styles.idText, { color: colors.textSecondary }]}>
                              ID: #{item.id}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.historyAmount, { color: colors.text }]}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>

                      {/* Detalhes de datas */}
                      <View style={styles.historyDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                            <Text style={styles.detailLabel}>Agendada para:</Text> {formatDateTime(item.scheduledDate)}
                          </Text>
                        </View>
                        {item.executedDate && (
                          <View style={styles.detailRow}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              <Text style={styles.detailLabel}>Executada em:</Text> {formatDateTime(item.executedDate)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Mensagem de erro */}
                      {item.errorMessage && (
                        <View style={[styles.messageBox, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                          <Ionicons name="alert-circle" size={16} color={colors.error} />
                          <Text style={[styles.messageText, { color: colors.error }]}>
                            <Text style={styles.messageBold}>Erro:</Text> {item.errorMessage}
                          </Text>
                        </View>
                      )}

                      {/* Mensagem de sucesso */}
                      {item.transactionId && (
                        <View style={[styles.messageBox, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                          <Text style={[styles.messageText, { color: colors.success }]}>
                            Transação #{item.transactionId} criada com sucesso
                          </Text>
                        </View>
                      )}

                      {/* Informação de saldo */}
                      {item.accountBalanceBefore && item.accountBalanceAfter && (
                        <View style={[styles.balanceBox, { backgroundColor: colors.info + '10', borderColor: colors.info }]}>
                          <Text style={[styles.balanceTitle, { color: colors.text }]}>Saldo da Conta:</Text>
                          <View style={styles.balanceRow}>
                            <Text style={[styles.balanceValue, { color: colors.text }]}>
                              {formatCurrency(item.accountBalanceBefore)}
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                            <Text style={[styles.balanceValue, styles.balanceValueBold, { color: colors.text }]}>
                              {formatCurrency(item.accountBalanceAfter)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  summaryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  summaryAlertText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  historyCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  historyContent: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  historyMainInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  idText: {
    fontSize: 12,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyDetails: {
    gap: 6,
    marginTop: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  detailLabel: {
    fontWeight: '600',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  messageText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  messageBold: {
    fontWeight: '600',
  },
  balanceBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceValue: {
    fontSize: 13,
  },
  balanceValueBold: {
    fontWeight: '600',
  },
});
