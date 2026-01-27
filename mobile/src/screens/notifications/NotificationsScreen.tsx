import React, { useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationContext } from '../../contexts/NotificationContext';

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const { formatCurrency } = useCurrency();
  const { formatDate, formatRelativeDate } = useDate();
  const { refreshUnreadCount } = useNotificationContext();
  const {
    notifications,
    loading,
    refreshing,
    unreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  // Recarregar notificações quando a tela ganhar foco
  useFocusEffect(
    React.useCallback(() => {
      refresh();
      refreshUnreadCount();
    }, [refresh, refreshUnreadCount])
  );

  const onRefresh = () => {
    refresh();
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'urgent':
        return notifications.filter(n => n.type === 'error' || n.type === 'warning');
      default:
        return notifications;
    }
  };

  const getUnreadCount = () => unreadCount;
  const getUrgentCount = () => notifications.filter(n => n.type === 'error' || n.type === 'warning').length;

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      refreshUnreadCount(); // Atualizar contador global
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on category and metadata
    if (notification.category === 'budget' && notification.metadata?.budgetId) {
      navigation.navigate('BudgetDetail', { budgetId: notification.metadata.budgetId });
    } else if (notification.actionUrl) {
      // Handle other navigation based on actionUrl
      // This could be expanded for other notification types
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      refreshUnreadCount(); // Atualizar contador global
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Excluir Notificação',
      'Tem certeza que deseja excluir esta notificação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notificationId);
              refreshUnreadCount(); // Atualizar contador global
            } catch (error) {
              // Error already handled in hook
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'error':
        return COLORS.error;
      case 'warning':
        return '#FF6B35';
      case 'success':
        return COLORS.success;
      case 'info':
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  const getTypeIcon = (category: string) => {
    switch (category) {
      case 'debt':
        return 'card';
      case 'loan':
        return 'cash';
      case 'savings':
        return 'trophy';
      case 'account':
        return 'wallet';
      case 'recurring':
        return 'repeat';
      case 'budget':
        return 'pie-chart';
      case 'general':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'success':
        return COLORS.success;
      case 'info':
        return COLORS.info;
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
              onPress={handleMarkAllAsRead}
              variant="outline"
              size="sm"
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
              const priorityColor = getPriorityColor(notification.type);
              const typeIcon = getTypeIcon(notification.category);
              const typeColor = getTypeColor(notification.type);
              
              return (
                <Card 
                  key={notification.id} 
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadCard,
                    notification.type === 'error' && styles.urgentCard,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
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
                      
                      {notification.actionText && (
                        <Text style={styles.notificationAction}>
                          👉 {notification.actionText}
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
                            {notification.type === 'error' ? 'Urgente' :
                             notification.type === 'warning' ? 'Atenção' :
                             notification.type === 'success' ? 'Sucesso' : 'Info'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNotification(notification.id)}
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
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  notificationAction: {
    fontSize: 12,
    color: COLORS.primary,
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