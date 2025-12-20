import { apiClient } from './client';
import type { ApiResponse, Notification } from '../types';

export const notificationsApi = {
  // Get all notifications
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get<ApiResponse<{ notifications: Notification[] }>>('/notifications');
    return response.data.data?.notifications || [];
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data.data?.count || 0;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  }
};