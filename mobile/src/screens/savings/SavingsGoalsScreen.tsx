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
import { SavingsGoal } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface SavingsGoalsScreenProps {
  navigation?: any;
}

export const SavingsGoalsScreen: React.FC<SavingsGoalsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDate();
  
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/savings-goals');
      // Handle both { data: goals } and { data: { goals } } structures
      const data = response.data?.data?.goals || response.data?.data || response.data || [];
      setGoals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoals();
  };

  const getActiveGoals = () => goals.filter(goal => {
    const current = parseFloat(goal.accountBalance || goal.currentAmount || '0');
    const target = parseFloat(goal.targetAmount || '0');
    return current < target && goal.isActive !== false;
  });
  
  const getCompletedGoals = () => goals.filter(goal => {
    const current = parseFloat(goal.accountBalance || goal.currentAmount || '0');
    const target = parseFloat(goal.targetAmount || '0');
    return current >= target || goal.isCompleted === true;
  });

  const getTotalSaved = () => {
    return getActiveGoals().reduce((total, goal) => {
      return total + parseFloat(goal.accountBalance || goal.currentAmount || '0');
    }, 0);
  };

  const getTotalTarget = () => {
    return getActiveGoals().reduce((total, goal) => {
      return total + parseFloat(goal.targetAmount || '0');
    }, 0);
  };

  const getProgress = (goal: SavingsGoal) => {
    const current = parseFloat(goal.accountBalance || goal.currentAmount || '0');
    const target = parseFloat(goal.targetAmount || '1');
    return Math.min((current / target) * 100, 100);
  };

  const getCurrentAmount = (goal: SavingsGoal) => {
    return parseFloat(goal.accountBalance || goal.currentAmount || '0');
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    return colors.error;
  };

  const isOverdue = (goal: SavingsGoal) => {
    const deadline = goal.deadline || goal.targetDate;
    if (!deadline) return false;
    const current = parseFloat(goal.accountBalance || goal.currentAmount || '0');
    const target = parseFloat(goal.targetAmount || '0');
    if (current >= target) return false; // Already completed
    return new Date(deadline) < new Date();
  };

  const handleDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      'Eliminar Meta',
      `Tem certeza que deseja eliminar "${goal.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/savings-goals/${goal.id}`);
              showSuccess('Meta eliminada');
              fetchGoals();
            } catch (error) {
              showError('Erro ao eliminar meta');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Carregando metas..." />;
  }

  const overallProgress = getTotalTarget() > 0 
    ? (getTotalSaved() / getTotalTarget()) * 100 
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Metas de Poupança</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation?.navigate('AddSavingsGoal', {})}
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
          <Card variant="elevated" padding="md" style={[styles.statCard, { backgroundColor: colors.success }]}>
            <Ionicons name="trending-up" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Total Poupado</Text>
            <Text style={styles.statValue}>{formatCurrency(getTotalSaved())}</Text>
          </Card>
          <Card variant="elevated" padding="md" style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="flag" size={20} color="#FFFFFF" />
            <Text style={styles.statLabel}>Meta Total</Text>
            <Text style={styles.statValue}>{formatCurrency(getTotalTarget())}</Text>
          </Card>
        </View>

        {/* Progresso Geral */}
        {goals.length > 0 && (
          <Card variant="default" padding="lg" style={styles.progressCard}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Progresso Geral</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(overallProgress, 100)}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {overallProgress.toFixed(1)}% das metas atingidas
            </Text>
          </Card>
        )}

        {/* Metas Ativas */}
        {getActiveGoals().length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Metas Ativas ({getActiveGoals().length})
            </Text>
            {getActiveGoals().map((goal) => {
              const progress = getProgress(goal);
              const progressColor = getProgressColor(progress);
              const currentAmount = getCurrentAmount(goal);
              const targetAmount = parseFloat(goal.targetAmount || '0');
              const remaining = targetAmount - currentAmount;
              const deadline = goal.deadline || goal.targetDate;

              return (
                <Card key={goal.id} variant="default" padding="md" style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                      {goal.accountName && (
                        <Text style={[styles.goalDate, { color: colors.primary }]}>
                          🏦 {goal.accountName}{goal.accountBank ? ` - ${goal.accountBank}` : ''}
                        </Text>
                      )}
                      {deadline && (
                        <Text style={[
                          styles.goalDate,
                          { color: isOverdue(goal) ? colors.error : colors.textSecondary }
                        ]}>
                          {isOverdue(goal) ? '⚠️ Atrasada - ' : '📅 '}
                          Meta: {formatDate(deadline)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(goal.name, 'Escolha uma opção', [
                          { text: 'Editar', onPress: () => navigation?.navigate('AddSavingsGoal', { goal }) },
                          { text: 'Eliminar', onPress: () => handleDeleteGoal(goal), style: 'destructive' },
                          { text: 'Cancelar', style: 'cancel' },
                        ]);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.goalAmounts}>
                      <Text style={[styles.goalCurrent, { color: colors.text }]}>
                        {formatCurrency(currentAmount)}
                      </Text>
                      <Text style={[styles.goalTarget, { color: colors.textSecondary }]}>
                        de {formatCurrency(targetAmount)}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View style={[styles.goalProgressBar, { backgroundColor: colors.surfaceSecondary }]}>
                        <View
                          style={[styles.goalProgressFill, { width: `${progress}%`, backgroundColor: progressColor }]}
                        />
                      </View>
                      <Text style={[styles.progressPercent, { color: progressColor }]}>
                        {progress.toFixed(0)}%
                      </Text>
                    </View>

                    {remaining > 0 && (
                      <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
                        Faltam: {formatCurrency(remaining)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.goalActions}>
                    <Button
                      title="Contribuir"
                      onPress={() => navigation?.navigate('AddTransaction', { 
                        type: 'receita',
                        savingsGoalId: goal.id 
                      })}
                      size="sm"
                      icon="add-circle-outline"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Detalhes"
                      onPress={() => navigation?.navigate('AddSavingsGoal', { goal })}
                      variant="outline"
                      size="sm"
                      icon="eye-outline"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="flag-outline"
            title="Nenhuma meta ativa"
            description="Crie sua primeira meta de poupança para começar a economizar"
            actionLabel="Criar Meta"
            onAction={() => navigation?.navigate('AddSavingsGoal', {})}
          />
        )}

        {/* Metas Concluídas */}
        {getCompletedGoals().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Metas Concluídas ({getCompletedGoals().length})
            </Text>
            {getCompletedGoals().map((goal) => {
              const currentAmount = getCurrentAmount(goal);
              return (
                <Card
                  key={goal.id}
                  variant="outlined"
                  padding="md"
                  style={[styles.goalCard, { borderColor: colors.success }]}
                >
                  <View style={styles.completedHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.goalName, { color: colors.text, marginLeft: SPACING.sm }]}>
                      {goal.name}
                    </Text>
                  </View>
                  <Text style={[styles.completedText, { color: colors.success }]}>
                    ✅ Meta atingida! {formatCurrency(currentAmount)} de {formatCurrency(goal.targetAmount)}
                  </Text>
                  {goal.accountName && (
                    <Text style={[styles.goalDate, { color: colors.textSecondary, marginTop: 4 }]}>
                      🏦 {goal.accountName}
                    </Text>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
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
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 13,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  goalCard: {
    marginBottom: SPACING.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  goalDate: {
    fontSize: 12,
  },
  goalProgress: {
    marginBottom: SPACING.md,
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  goalCurrent: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalTarget: {
    fontSize: 13,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  goalProgressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  remainingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  goalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
