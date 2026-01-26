import api, { apiHelpers } from './api';

export interface Notification {
  id: string;
  userId: number;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'loan' | 'debt' | 'savings' | 'recurring' | 'account' | 'general' | 'budget';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: string | Date;
  expiresAt?: string | Date;
  metadata?: {
    budgetId?: number;
    categoryId?: number;
    currentSpending?: number;
    budgetAmount?: number;
    percentageUsed?: number;
  };
}

export interface NotificationSettings {
  pushNotifications: boolean;
  debtReminders: boolean;
  loanReminders: boolean;
  goalAchievements: boolean;
  lowBalance: boolean;
  transactions: boolean;
  systemUpdates: boolean;
  budgetAlerts: boolean;
  reminderDays: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationsResponse {
  status: string;
  data: {
    notifications: Notification[];
  };
}

interface UnreadCountResponse {
  status: string;
  data: {
    count: number;
  };
}

interface SuccessResponse {
  status: string;
  message: string;
}

export const notificationsService = {
  /**
   * Get all notifications for the current user
   */
  getAll: async (): Promise<Notification[]> => {
    try {
      const response = await apiHelpers.get<NotificationsResponse>('/notifications');
      return response.data.notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiHelpers.get<UnreadCountResponse>('/notifications/unread-count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      await apiHelpers.post<SuccessResponse>(`/notifications/${notificationId}/read`, {});
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    try {
      await apiHelpers.post<SuccessResponse>('/notifications/read-all', {});
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   */
  delete: async (notificationId: string): Promise<void> => {
    try {
      await apiHelpers.delete<SuccessResponse>(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Get notification settings (local storage for now)
   */
  getSettings: async (): Promise<NotificationSettings> => {
    // For now, return default settings
    // In the future, this could be stored in the backend
    return {
      pushNotifications: true,
      debtReminders: true,
      loanReminders: true,
      goalAchievements: true,
      lowBalance: true,
      transactions: false,
      systemUpdates: false,
      budgetAlerts: true,
      reminderDays: 3,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    };
  },

  /**
   * Save notification settings (local storage for now)
   */
  saveSettings: async (settings: NotificationSettings): Promise<void> => {
    // For now, just log
    // In the future, this could be stored in the backend
    console.log('Saving notification settings:', settings);
  },
};
