import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { X, TrendingUp, AlertCircle } from 'lucide-react';

interface BudgetNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  budgetId?: number;
  metadata?: {
    currentSpending?: number;
    budgetAmount?: number;
    percentageUsed?: number;
  };
}

interface BudgetNotificationToastProps {
  notification: BudgetNotification;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

/**
 * Budget Notification Toast Component
 * 
 * Displays budget alert notifications with:
 * - Visual styling based on alert type
 * - Budget spending information
 * - Click to navigate to budget detail
 * - Auto-close functionality
 * 
 * Requirements: 4.6, 7.2
 */
export const BudgetNotificationToast: React.FC<BudgetNotificationToastProps> = ({
  notification,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}) => {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto close
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleClick = () => {
    if (notification.budgetId) {
      setLocation(`/budgets/${notification.budgetId}`);
      handleClose();
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-md w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          ${getBackgroundColor()}
          border rounded-lg shadow-lg p-4
          cursor-pointer hover:shadow-xl transition-shadow
        `}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${getIconColor()}`}>
            {notification.type === 'error' || notification.type === 'warning' ? (
              <AlertCircle size={24} />
            ) : (
              <TrendingUp size={24} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${getTextColor()} mb-1`}>
              {notification.title}
            </h3>
            <p className={`text-sm ${getTextColor()} mb-2`}>
              {notification.message}
            </p>

            {notification.metadata && (
              <div className="space-y-1">
                {notification.metadata.currentSpending !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className={getTextColor()}>Gasto atual:</span>
                    <span className={`font-semibold ${getTextColor()}`}>
                      {formatCurrency(notification.metadata.currentSpending)}
                    </span>
                  </div>
                )}
                {notification.metadata.budgetAmount !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className={getTextColor()}>Orçamento:</span>
                    <span className={`font-semibold ${getTextColor()}`}>
                      {formatCurrency(notification.metadata.budgetAmount)}
                    </span>
                  </div>
                )}
                {notification.metadata.percentageUsed !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className={getTextColor()}>Percentual:</span>
                    <span className={`font-semibold ${getTextColor()}`}>
                      {notification.metadata.percentageUsed.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {notification.budgetId && (
              <p className={`text-xs ${getTextColor()} mt-2 font-medium`}>
                Clique para ver detalhes →
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className={`flex-shrink-0 ${getTextColor()} hover:opacity-70 transition-opacity`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Budget Notification Container
 * 
 * Manages multiple budget notification toasts
 */
export const BudgetNotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<BudgetNotification[]>([]);

  useEffect(() => {
    // Listen for budget notification events
    const handleBudgetNotification = (event: CustomEvent<BudgetNotification>) => {
      const notification = event.detail;
      setNotifications((prev) => [...prev, notification]);
    };

    window.addEventListener('budget-notification' as any, handleBudgetNotification);

    return () => {
      window.removeEventListener('budget-notification' as any, handleBudgetNotification);
    };
  }, []);

  const handleClose = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ top: `${4 + index * 8}rem` }}
          className="fixed right-4 z-50"
        >
          <BudgetNotificationToast
            notification={notification}
            onClose={() => handleClose(notification.id)}
          />
        </div>
      ))}
    </>
  );
};

/**
 * Helper function to trigger budget notifications
 */
export const showBudgetNotification = (notification: Omit<BudgetNotification, 'id'>) => {
  const event = new CustomEvent('budget-notification', {
    detail: {
      ...notification,
      id: `budget-${Date.now()}-${Math.random()}`,
    },
  });
  window.dispatchEvent(event);
};
