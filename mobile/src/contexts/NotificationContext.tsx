import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsService } from '../services/notifications.service';

interface NotificationContextData {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextData>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

const POLLING_INTERVAL = 30000; // 30 segundos

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    // Carregar contagem inicial
    refreshUnreadCount();

    // Iniciar polling
    pollingIntervalRef.current = setInterval(() => {
      refreshUnreadCount();
    }, POLLING_INTERVAL);

    // Limpar intervalo ao desmontar
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
