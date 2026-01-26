import { useState, useEffect, useCallback } from 'react';
import { notificationsService, Notification } from '../services/notifications.service';
import { useToast } from '../contexts/ToastContext';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.getAll();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Erro ao carregar notificações', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Erro ao marcar notificação como lida', 'error');
      throw error;
    }
  }, [showToast]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      showToast('Todas as notificações marcadas como lidas', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Erro ao marcar todas como lidas', 'error');
      throw error;
    }
  }, [showToast]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.delete(notificationId);
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
      showToast('Notificação excluída', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('Erro ao excluir notificação', 'error');
      throw error;
    }
  }, [showToast]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    refreshing,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
};
