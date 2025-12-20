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

interface Notification {
  id: number;
  type: 'debt_due' | 'loan_due' | 'goal_achieved' | 'low_balance' | 'transaction' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  actionUrl?: string;
  metadata?: {
    amount?: string;
    entityName?: string;
    dueDate?: string;
  };
}

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();

  const fetchNotifications = async () => {
    try {
      // Simular dados de notificações
      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'debt_due',
          title: 'Dívida Vencendo Hoje',
          message: 'Sua dívida com Cartão de Crédito BFA vence hoje',
          isRead: false,
          priority: 'urgent',
          createdAt: '2024-12-18T08:00:00Z',
          metadata: {
            amount: '85000.00',
            entityName: 'Cartão de Crédito BFA',
            dueDate: '2024-12-18T23:59:59Z',
          },
        },
        {
          id: 2,
          type: 'loan_due',
          title: 'Empréstimo Vence em 3 Dias',
          message: 'O empréstimo para João Silva vence em 3 dias',
          isRead: false,
          priority: 'high',
          createdAt: '2024-12-18T07:30:00Z',
          metadata: {
            amount: '150000.00',
            entityName: 'João Silva',
            dueDate: '2024-12-21T00:00:00Z',
          },
        },
        {
          id: 3,
          type: 'goal_achieved',
          title: 'Meta Atingida! 🎉',
          message: 'Parabéns! Você atingiu sua meta "Casa Própria"',
          isRead: true,
          priority: 'medium',
          createdAt: '2024-12-17T15:20:00Z',
          metadata: {
            amount: '2000000.00',
            entityName: 'Casa Própria',
          },
        },
        {
          id: 4,
          type: 'low_balance',
          title: 'Saldo Baixo',
          message: 'Sua conta BAI está com saldo baixo',
          isRead: false,
          priority: 'medium',
          createdAt: '2024-12-17T12:00:00Z',
          metadata: {
            amount: '15000.00',
            entityName: 'Conta Corrente BAI',
          },
        },
        {
          id: 5,
          type: 'transaction',
          title: 'Nova Transação',
          message: 'Receita de 150.000 AOA foi registrada',
          isRead: true,
          priority: 'low',
          createdAt: '2024-12-16T14:45:00Z',
          metadata: {
            amount: '150000.00',
          },
        },
        {
          id: 6,
          type: 'system',
          title: 'Backup Realizado',
          message: 'Backup automático dos seus dados foi concluído',
          isRead: true,
          priority: 'low',
          createdAt: '2024-12-15T02:00:00Z',
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'urgent':
        return notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
      default:
        return notifications;
    }
  };

  const getUnreadCount = () => notifications.filter(n => !n.isRead).length;
  const getUrgentCount = () => notifications.filter(n => n.priority === 'urgent').length;

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const deleteNotification = (notificationId: number) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return COLORS.error;
      case 'high':
        return '#FF6B35';
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'debt_due':
        return 'card';
      case 'loan_due':
        return 'cash';
      case 'goal_achieved':
        return 'trophy';
      case 'low_balance':
        return 'wallet';
      case 'transaction':
        return 'swap-horizontal';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'debt_due':
        return COLORS.error;
      case 'loan_due':
        return COLORS.success;
      case 'goal_achieved':
        return COLORS.warning;
      case 'low_balance':
        return COLORS.error;
      case 'transaction':
        return COLORS.primary;
      case 'system':
        return COLORS.textSecondary;
      default:
        return COLORS.primary;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando notificações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="settings" size={24} color={COLORS.textSecondary} />
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
            title="Total"
            value={notifications.length}
            icon="notifications"
            color={COLORS.primary}
          />
          <StatCard
            title="Não Lidas"
            value={getUnreadCount()}
            icon="mail-unread"
            color={COLORS.warning}
          />
          <StatCard
            title="Urgentes"
            value={getUrgentCount()}
            icon="alert-circle"
            color={COLORS.error}
          />
        </View>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'all' && styles.filterTextActive,
                ]}
              >
                Todas ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'unread' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('unread')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'unread' && styles.filterTextActive,
                ]}
              >
                Não Lidas ({getUnreadCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'urgent' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('urgent')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'urgent' && styles.filterTextActive,
                ]}
              >
                Urgentes ({getUrgentCount()})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ações Rápidas */}
        {getUnreadCount() > 0 && (
          <View style={styles.quickActionsContainer}>
            <Button
              title={`Marcar Todas como Lidas (${getUnreadCount()})`}
              onPress={markAllAsRead}
              variant="outline"
              size="small"
            />
          </View>
        )}

        {/* Lista de Notificações */}
        <View style={styles.notificationsList}>
          {filteredNotifications.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="notifications-off" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Nenhuma notificação' : 
                 filter === 'unread' ? 'Nenhuma notificação não lida' :
                 'Nenhuma notificação urgente'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' 
                  ? 'Você não tem notificações no momento'
                  : 'Altere o filtro para ver outras notificações'
                }
              </Text>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const priorityColor = getPriorityColor(notification.priority);
              const typeIcon = getTypeIcon(notification.type);
              const typeColor = getTypeColor(notification.type);
              
              return (
                <Card 
                  key={notification.id} 
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadCard,
                    notification.priority === 'urgent' && styles.urgentCard,
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationIcon}>
                      <Ionicons
                        name={typeIcon}
                        size={20}
                        color={typeColor}
                      />
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={[
                          styles.notificationTitle,
                          !notification.isRead && styles.unreadTitle,
                        ]}>
                          {notification.title}
                        </Text>
                        {!notification.isRead && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      
                      {notification.metadata?.amount && (
                        <Text style={styles.notificationAmount}>
                          💰 {formatCurrency(parseFloat(notification.metadata.amount))}
                        </Text>
                      )}
                      
                      <View style={styles.notificationFooter}>
                        <Text style={styles.notificationTime}>
                          {formatRelativeDate(notification.createdAt)}
                        </Text>
                        
                        <View style={[
                          styles.priorityBadge,
                          { backgroundColor: `${priorityColor}20` }
                        ]}>
                          <Text style={[
                            styles.priorityText,
                            { color: priorityColor }
                          ]}>
                            {notification.priority === 'urgent' ? 'Urgente' :
                             notification.priority === 'high' ? 'Alta' :
                             notification.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteNotification(notification.id)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
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
  settingsButton: {
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
  filtersContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  quickActionsContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  notificationsList: {
    paddingHorizontal: SPACING.lg,
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
  },
  notificationCard: {
    marginBottom: SPACING.md,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  urgentCard: {
    backgroundColor: `${COLORS.error}05`,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  notificationMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  notificationAmount: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deleteButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});