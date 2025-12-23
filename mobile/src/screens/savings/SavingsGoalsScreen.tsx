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
import { SavingsGoal } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';

interface SavingsGoalsScreenProps {
  navigation: any;
}

export const SavingsGoalsScreen: React.FC<SavingsGoalsScreenProps> = ({ navigation }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchGoals = async () => {
    try {
      // Simular dados de metas
      const mockGoals: SavingsGoal[] = [
        {
          id: 1,
          name: 'Viagem para Europa',
          targetAmount: '500000.00',
          currentAmount: '375000.00',
          targetDate: '2025-06-15T00:00:00Z',
          description: 'Férias de verão na Europa',
          isActive: true,
          userId: 1,
        },
        {
          id: 2,
          name: 'Fundo de Emergência',
          targetAmount: '300000.00',
          currentAmount: '180000.00',
          targetDate: '2025-03-01T00:00:00Z',
          description: '6 meses de despesas',
          isActive: true,
          userId: 1,
        },
        {
          id: 3,
          name: 'Novo Carro',
          targetAmount: '800000.00',
          currentAmount: '200000.00',
          targetDate: '2025-12-31T00:00:00Z',
          description: 'Carro novo para a família',
          isActive: true,
          userId: 1,
        },
        {
          id: 4,
          name: 'Casa Própria',
          targetAmount: '2000000.00',
          currentAmount: '2000000.00',
          targetDate: '2024-12-01T00:00:00Z',
          description: 'Entrada para casa própria',
          isActive: false,
          userId: 1,
        },
      ];
      setGoals(mockGoals);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoals();
  };

  const getActiveGoals = () => goals.filter(goal => goal.isActive);
  const getCompletedGoals = () => goals.filter(goal => !goal.isActive);

  const getTotalSaved = () => {
    return getActiveGoals().reduce((total, goal) => {
      // Use account balance if available
      const amount = goal.accountBalance ? parseFloat(goal.accountBalance) : parseFloat(goal.currentAmount);
      return total + amount;
    }, 0);
  };

  const getTotalTarget = () => {
    return getActiveGoals().reduce((total, goal) => {
      return total + parseFloat(goal.targetAmount);
    }, 0);
  };

  const getProgress = (goal: SavingsGoal) => {
    // Use account balance if available, otherwise use currentAmount
    const current = goal.accountBalance ? parseFloat(goal.accountBalance) : parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    return Math.min((current / target) * 100, 100);
  };

  const getCurrentAmount = (goal: SavingsGoal) => {
    // Use account balance if available, otherwise use currentAmount
    return goal.accountBalance ? parseFloat(goal.accountBalance) : parseFloat(goal.currentAmount);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return COLORS.success;
    if (progress >= 75) return COLORS.primary;
    if (progress >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const isOverdue = (goal: SavingsGoal) => {
    if (!goal.targetDate) return false;
    return new Date(goal.targetDate) < new Date() && goal.isActive;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando metas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Metas de Poupança</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddSavingsGoal')}
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
            title="Total Poupado"
            value={formatCurrency(getTotalSaved())}
            icon="trending-up"
            color={COLORS.success}
          />
          <StatCard
            title="Meta Total"
            value={formatCurrency(getTotalTarget())}
            icon="flag"
            color={COLORS.primary}
          />
        </View>

        {/* Progresso Geral */}
        <Card style={styles.overallProgressCard}>
          <Text style={styles.overallProgressTitle}>Progresso Geral</Text>
          <View style={styles.overallProgressBar}>
            <View
              style={[
                styles.overallProgressFill,
                {
                  width: `${Math.min((getTotalSaved() / getTotalTarget()) * 100, 100)}%`,
                  backgroundColor: COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.overallProgressText}>
            {((getTotalSaved() / getTotalTarget()) * 100).toFixed(1)}% das metas atingidas
          </Text>
        </Card>

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Nova Meta de Poupança"
            onPress={() => navigation.navigate('AddSavingsGoal')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Metas Ativas */}
        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Metas Ativas ({getActiveGoals().length})</Text>
          
          {getActiveGoals().length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="flag" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma meta ativa</Text>
              <Text style={styles.emptySubtitle}>
                Crie sua primeira meta de poupança para começar a economizar
              </Text>
              <Button
                title="Criar Primeira Meta"
                onPress={() => navigation.navigate('AddSavingsGoal')}
                variant="outline"
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            getActiveGoals().map((goal) => {
              const progress = getProgress(goal);
              const progressColor = getProgressColor(progress);
              const currentAmount = getCurrentAmount(goal);
              const remaining = parseFloat(goal.targetAmount) - currentAmount;
              
              return (
                <Card key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      {goal.accountName && (
                        <Text style={styles.goalAccount}>
                          💳 {goal.accountName} {goal.accountBank && `(${goal.accountBank})`}
                        </Text>
                      )}
                      {goal.description && (
                        <Text style={styles.goalDescription}>{goal.description}</Text>
                      )}
                      {goal.targetDate && (
                        <Text style={[
                          styles.goalDate,
                          isOverdue(goal) && styles.goalDateOverdue
                        ]}>
                          {isOverdue(goal) ? '⚠️ Atrasada - ' : '📅 '}
                          Meta: {formatDate(goal.targetDate)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity style={styles.goalMenuButton}>
                      <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.goalAmounts}>
                      <Text style={styles.goalCurrent}>
                        {formatCurrency(currentAmount)}
                      </Text>
                      <Text style={styles.goalTarget}>
                        de {formatCurrency(parseFloat(goal.targetAmount))}
                      </Text>
                    </View>
                    
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progress}%`,
                              backgroundColor: progressColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: progressColor }]}>
                        {progress.toFixed(1)}%
                      </Text>
                    </View>

                    {remaining > 0 && (
                      <Text style={styles.remainingText}>
                        Faltam: {formatCurrency(remaining)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.goalActions}>
                    <Button
                      title="Contribuir"
                      onPress={() => {}}
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
                </Card>
              );
            })
          )}
        </View>

        {/* Metas Concluídas */}
        {getCompletedGoals().length > 0 && (
          <View style={styles.goalsSection}>
            <Text style={styles.sectionTitle}>Metas Concluídas ({getCompletedGoals().length})</Text>
            
            {getCompletedGoals().map((goal) => (
              <Card key={goal.id} style={[styles.goalCard, styles.completedGoalCard]}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <View style={styles.completedGoalHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      <Text style={styles.goalName}>{goal.name}</Text>
                    </View>
                    {goal.description && (
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    )}
                    <Text style={styles.completedText}>
                      ✅ Meta atingida! {formatCurrency(parseFloat(goal.targetAmount))}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  overallProgressCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  overallProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  overallProgressBar: {
    width: '100%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  overallProgressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  goalsSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
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
  goalCard: {
    marginBottom: SPACING.md,
  },
  completedGoalCard: {
    backgroundColor: `${COLORS.success}05`,
    borderColor: COLORS.success,
    borderWidth: 1,
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
  completedGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  goalAccount: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  goalDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  goalDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  goalDateOverdue: {
    color: COLORS.error,
    fontWeight: '500',
  },
  goalMenuButton: {
    padding: SPACING.xs,
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
    fontWeight: 'bold',
    color: COLORS.text,
  },
  goalTarget: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  goalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});