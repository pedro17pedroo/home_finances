import { useState } from 'react';
import { Bell, Check, CheckCheck, AlertCircle, Info, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { useNotifications } from '../../../shared/hooks/use-notifications';
import { Link } from 'wouter';
import type { Notification } from '../../../shared/types';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="w-6 h-6 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'info':
    default:
      return <Info className="w-6 h-6 text-blue-500" />;
  }
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Agora mesmo';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''} atrás`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
  }

  return date.toLocaleString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type FilterType = 'all' | 'unread' | 'budget' | 'general';

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'budget') return notification.category === 'budget';
    if (filter === 'general') return notification.category === 'general';
    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notificações
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {unreadCount > 0
                ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : 'Todas as notificações lidas'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Não lidas ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('budget')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'budget'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Orçamentos ({notifications.filter((n) => n.category === 'budget').length})
          </button>
          <button
            onClick={() => setFilter('general')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === 'general'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Geral ({notifications.filter((n) => n.category === 'general').length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-center text-lg">
              {filter === 'all'
                ? 'Nenhuma notificação'
                : filter === 'unread'
                ? 'Nenhuma notificação não lida'
                : `Nenhuma notificação de ${filter === 'budget' ? 'orçamentos' : 'geral'}`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const content = (
    <div
      className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {notification.title}
            </h3>
            {!notification.isRead && (
              <span className="ml-3 flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {notification.message}
          </p>
          
          {/* Metadata */}
          {notification.metadata && (
            <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {notification.metadata.currentSpending !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Gasto atual:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('pt-AO', {
                        style: 'currency',
                        currency: 'AOA',
                      }).format(notification.metadata.currentSpending)}
                    </span>
                  </div>
                )}
                {notification.metadata.budgetAmount !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Orçamento:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('pt-AO', {
                        style: 'currency',
                        currency: 'AOA',
                      }).format(notification.metadata.budgetAmount)}
                    </span>
                  </div>
                )}
                {notification.metadata.percentageUsed !== undefined && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Percentual usado:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {notification.metadata.percentageUsed.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {formatDateTime(notification.createdAt)}
            </span>
            {notification.actionText && notification.actionUrl && (
              <Link href={notification.actionUrl}>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300">
                  {notification.actionText} →
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}
