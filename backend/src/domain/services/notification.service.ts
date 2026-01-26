import { LoanService } from "./loan.service.js";
import { DebtService } from "./debt.service.js";
import { SavingsGoalService } from "./savings-goal.service.js";
import { RecurringTransactionService } from "./recurring-transaction.service.js";
import { CategoryService } from "./category.service.js";
import { logger } from "../../core/utils/logger.js";
import { emailService } from "../../infrastructure/email/email.service.js";
import { db } from "../../core/database/db.js";
import { users } from "../../core/database/schema.js";
import { eq } from "drizzle-orm";
import type {
  Alert,
  Budget,
  SpendingCalculation,
  NotificationPayload,
  ChannelType
} from "../entities/budget.types.js";

export interface Notification {
  id: string;
  userId: number;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'loan' | 'debt' | 'savings' | 'recurring' | 'account' | 'general';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export class NotificationService {
  private static notifications: Map<number, Notification[]> = new Map();

  /**
   * Gera todas as notificações para um usuário
   */
  static async generateNotificationsForUser(userId: number): Promise<Notification[]> {
    const notifications: Notification[] = [];

    try {
      // Notificações de empréstimos em atraso
      const overdueLoans = await LoanService.getOverdueLoans(userId);
      for (const loan of overdueLoans) {
        notifications.push({
          id: `loan-overdue-${loan.id}`,
          userId,
          type: 'warning',
          category: 'loan',
          title: 'Empréstimo em Atraso',
          message: `O empréstimo para ${loan.borrower} no valor de ${this.formatCurrency(loan.amount)} está em atraso desde ${this.formatDate(loan.dueDate!)}`,
          actionUrl: '/loans',
          actionText: 'Ver Empréstimos',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Notificações de dívidas em atraso
      const overdueDebts = await DebtService.getOverdueDebts(userId);
      for (const debt of overdueDebts) {
        notifications.push({
          id: `debt-overdue-${debt.id}`,
          userId,
          type: 'error',
          category: 'debt',
          title: 'Dívida em Atraso',
          message: `Sua dívida com ${debt.creditor} no valor de ${this.formatCurrency(debt.amount)} está em atraso desde ${this.formatDate(debt.dueDate!)}`,
          actionUrl: '/debts',
          actionText: 'Ver Dívidas',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Notificações de empréstimos/dívidas próximos do vencimento (próximos 7 dias)
      const upcomingLoans = await this.getUpcomingLoans(userId, 7);
      for (const loan of upcomingLoans) {
        notifications.push({
          id: `loan-upcoming-${loan.id}`,
          userId,
          type: 'info',
          category: 'loan',
          title: 'Empréstimo Próximo do Vencimento',
          message: `O empréstimo para ${loan.borrower} vence em ${this.getDaysUntil(loan.dueDate!)} dias`,
          actionUrl: '/loans',
          actionText: 'Ver Empréstimos',
          isRead: false,
          createdAt: new Date()
        });
      }

      const upcomingDebts = await this.getUpcomingDebts(userId, 7);
      for (const debt of upcomingDebts) {
        notifications.push({
          id: `debt-upcoming-${debt.id}`,
          userId,
          type: 'warning',
          category: 'debt',
          title: 'Dívida Próxima do Vencimento',
          message: `Sua dívida com ${debt.creditor} vence em ${this.getDaysUntil(debt.dueDate!)} dias`,
          actionUrl: '/debts',
          actionText: 'Ver Dívidas',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Notificações de metas de poupança próximas do prazo
      const nearDeadlineGoals = await this.getNearDeadlineGoals(userId, 30);
      for (const goal of nearDeadlineGoals) {
        const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
        notifications.push({
          id: `goal-deadline-${goal.id}`,
          userId,
          type: progress < 50 ? 'warning' : 'info',
          category: 'savings',
          title: 'Meta de Poupança Próxima do Prazo',
          message: `Sua meta "${goal.name}" vence em ${this.getDaysUntil(goal.targetDate!)} dias. Progresso: ${progress.toFixed(1)}%`,
          actionUrl: '/savings-goals',
          actionText: 'Ver Metas',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Notificações de metas completadas
      const completedGoals = await this.getRecentlyCompletedGoals(userId, 7);
      for (const goal of completedGoals) {
        notifications.push({
          id: `goal-completed-${goal.id}`,
          userId,
          type: 'success',
          category: 'savings',
          title: 'Meta de Poupança Concluída! 🎉',
          message: `Parabéns! Você completou a meta "${goal.name}" no valor de ${this.formatCurrency(goal.targetAmount)}`,
          actionUrl: '/savings-goals',
          actionText: 'Ver Metas',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Notificações de transações recorrentes próximas
      const upcomingRecurring = await RecurringTransactionService.getUpcomingRecurringTransactions(userId, 3);
      if (upcomingRecurring.length > 0) {
        notifications.push({
          id: `recurring-upcoming-${userId}`,
          userId,
          type: 'info',
          category: 'recurring',
          title: 'Transações Recorrentes Próximas',
          message: `Você tem ${upcomingRecurring.length} transações recorrentes programadas para os próximos 3 dias`,
          actionUrl: '/transactions',
          actionText: 'Ver Transações',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Don't overwrite stored notifications (which may include budget alerts)
      // Just return the generated system notifications
      // this.notifications.set(userId, notifications);

      logger.info(`Geradas ${notifications.length} notificações para usuário ${userId}`);
      return notifications;

    } catch (error) {
      logger.error(`Erro ao gerar notificações para usuário ${userId}:`, error);
      return [];
    }
  }

  /**
   * Obtém todas as notificações de um usuário
   */
  static async getNotificationsForUser(userId: number): Promise<Notification[]> {
    // Get existing stored notifications (including budget alerts)
    const storedNotifications = this.notifications.get(userId) || [];
    
    // Generate system notifications (loans, debts, etc.)
    const systemNotifications = await this.generateNotificationsForUser(userId);
    
    // Merge stored and system notifications, removing duplicates by ID
    const allNotifications = [...storedNotifications];
    const storedIds = new Set(storedNotifications.map(n => n.id));
    
    for (const notification of systemNotifications) {
      if (!storedIds.has(notification.id)) {
        allNotifications.push(notification);
      }
    }
    
    // Sort by creation date (newest first)
    allNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return allNotifications;
  }

  /**
   * Marca uma notificação como lida
   */
  static async markAsRead(userId: number, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      logger.info(`Notificação ${notificationId} marcada como lida para usuário ${userId}`);
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async markAllAsRead(userId: number): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(n => n.isRead = true);
    logger.info(`Todas as notificações marcadas como lidas para usuário ${userId}`);
  }

  /**
   * Obtém contagem de notificações não lidas
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const notifications = await this.getNotificationsForUser(userId);
    return notifications.filter(n => !n.isRead).length;
  }

  /**
   * Exclui uma notificação
   */
  static async deleteNotification(userId: number, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const filteredNotifications = userNotifications.filter(n => n.id !== notificationId);
    this.notifications.set(userId, filteredNotifications);
    logger.info(`Notificação ${notificationId} excluída para usuário ${userId}`);
  }

  // Métodos auxiliares privados
  private static async getUpcomingLoans(userId: number, days: number): Promise<any[]> {
    const loans = await LoanService.getLoans(null, userId);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return loans.filter((loan: any) => 
      loan.status === 'pendente' && 
      loan.dueDate && 
      new Date(loan.dueDate) <= futureDate &&
      new Date(loan.dueDate) > new Date()
    );
  }

  private static async getUpcomingDebts(userId: number, days: number): Promise<any[]> {
    const debts = await DebtService.getDebts(null, userId);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return debts.filter((debt: any) => 
      debt.status === 'pendente' && 
      debt.dueDate && 
      new Date(debt.dueDate) <= futureDate &&
      new Date(debt.dueDate) > new Date()
    );
  }

  private static async getNearDeadlineGoals(userId: number, days: number) {
    const goals = await SavingsGoalService.getUserSavingsGoals(userId);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return goals.filter((goal: any) => 
      goal.isActive && 
      new Date(goal.targetDate) <= futureDate &&
      new Date(goal.targetDate) > new Date() &&
      parseFloat(goal.currentAmount) < parseFloat(goal.targetAmount)
    );
  }

  private static async getRecentlyCompletedGoals(userId: number, days: number) {
    const goals = await SavingsGoalService.getUserSavingsGoals(userId);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    
    return goals.filter((goal: any) => 
      parseFloat(goal.currentAmount) >= parseFloat(goal.targetAmount) &&
      goal.updatedAt && new Date(goal.updatedAt) >= pastDate
    );
  }

  private static formatCurrency(amount: string | number): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }

  private static formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-AO').format(dateObj);
  }

  private static getDaysUntil(date: string | Date): number {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // Budget Alert Notification Methods
  // ============================================================================

  /**
   * Send budget alert notifications through all enabled channels
   * 
   * @param userId - User ID to send notifications to
   * @param alert - Alert configuration with enabled channels
   * @param budget - Budget that triggered the alert
   * @param spending - Current spending calculation
   */
  static async sendBudgetAlert(
    userId: number,
    alert: Alert,
    budget: Budget,
    spending: SpendingCalculation
  ): Promise<void> {
    try {
      // Get category name for the notification
      const category = await CategoryService.getCategoryById(
        budget.categoryId,
        userId,
        budget.organizationId
      );

      // Build notification payload
      const payload = this.buildNotificationPayload(
        category.name,
        spending,
        typeof budget.amount === 'string' ? Number(budget.amount) : budget.amount
      );

      // Send notifications through all enabled channels
      const sendPromises: Promise<void>[] = [];

      for (const channel of alert.channels) {
        if (channel.enabled) {
          switch (channel.type) {
            case 'in_app':
              sendPromises.push(this.sendInAppNotification(userId, payload));
              break;
            case 'email':
              sendPromises.push(this.sendEmailNotification(userId, payload));
              break;
            case 'sms':
              sendPromises.push(this.sendSMSNotification(userId, payload));
              break;
          }
        }
      }

      // Send all notifications in parallel, but don't block on failures
      await Promise.allSettled(sendPromises);

      logger.info(`Budget alert sent for user ${userId}, budget ${budget.id}, alert ${alert.id}`);
    } catch (error) {
      // Log error but don't throw - notification failures should not block transaction processing
      logger.error(`Failed to send budget alert for user ${userId}:`, error);
    }
  }

  /**
   * Send in-app notification for budget alert
   * Delivers to both mobile and web platforms
   * 
   * @param userId - User ID
   * @param notification - Notification payload
   */
  static async sendInAppNotification(
    userId: number,
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // Determine if budget is exceeded based on exceeded amount
      const isExceeded = notification.data.exceededAmount !== undefined && notification.data.exceededAmount > 0;

      // Create in-app notification record
      const inAppNotification: Notification = {
        id: `budget-alert-${Date.now()}-${userId}`,
        userId,
        type: isExceeded ? 'error' : 'warning',
        category: 'general',
        title: notification.title,
        message: notification.message,
        actionUrl: '/budgets',
        actionText: 'Ver Orçamentos',
        isRead: false,
        createdAt: new Date(),
      };

      // Store notification in memory (in production, use database)
      const userNotifications = this.notifications.get(userId) || [];
      userNotifications.push(inAppNotification);
      this.notifications.set(userId, userNotifications);

      logger.info(`In-app notification sent to user ${userId} (mobile and web)`);
    } catch (error) {
      logger.error(`Failed to send in-app notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification for budget alert
   * 
   * @param userId - User ID
   * @param notification - Notification payload
   */
  static async sendEmailNotification(
    userId: number,
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // Get user email
      const user = await this.getUserById(userId);
      if (!user || !user.email) {
        logger.warn(`Cannot send email notification: user ${userId} has no email`);
        return;
      }

      // Build email HTML
      const html = this.buildBudgetAlertEmailHtml(notification);

      // Send email
      await emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        html,
      });

      logger.info(`Email notification sent to user ${userId} at ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send email notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send SMS notification for budget alert
   * 
   * @param userId - User ID
   * @param notification - Notification payload
   */
  static async sendSMSNotification(
    userId: number,
    notification: NotificationPayload
  ): Promise<void> {
    try {
      // Get user phone
      const user = await this.getUserById(userId);
      if (!user || !user.phone) {
        logger.warn(`Cannot send SMS notification: user ${userId} has no phone`);
        return;
      }

      // Build SMS message (keep it short)
      const smsMessage = `${notification.title}\n${notification.message}`;

      // TODO: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
      // For now, just log the SMS
      logger.info(`SMS notification for user ${userId} to ${user.phone}: ${smsMessage}`);

      // In production, call SMS API here:
      // await smsService.sendSMS(user.phone, smsMessage);
    } catch (error) {
      logger.error(`Failed to send SMS notification to user ${userId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods for Budget Alerts
  // ============================================================================

  /**
   * Build notification payload with all required fields
   * 
   * @param categoryName - Category name
   * @param spending - Spending calculation
   * @param budgetLimit - Budget limit amount
   * @returns Notification payload
   */
  private static buildNotificationPayload(
    categoryName: string,
    spending: SpendingCalculation,
    budgetLimit: number
  ): NotificationPayload {
    const isExceeded = spending.isExceeded;
    const percentageUsed = spending.percentageUsed;

    // Build title
    let title: string;
    if (isExceeded) {
      title = `⚠️ Orçamento Excedido: ${categoryName}`;
    } else if (percentageUsed >= 90) {
      title = `🚨 Alerta de Orçamento: ${categoryName}`;
    } else {
      title = `⚡ Alerta de Orçamento: ${categoryName}`;
    }

    // Build message
    let message: string;
    if (isExceeded) {
      message = `Você excedeu o orçamento de ${categoryName} em ${this.formatCurrency(spending.exceededAmount)}. ` +
                `Gasto atual: ${this.formatCurrency(spending.totalSpent)} (${percentageUsed.toFixed(1)}% do limite).`;
    } else {
      message = `Você atingiu ${percentageUsed.toFixed(1)}% do seu orçamento de ${categoryName}. ` +
                `Gasto atual: ${this.formatCurrency(spending.totalSpent)} de ${this.formatCurrency(budgetLimit)}. ` +
                `Restante: ${this.formatCurrency(spending.remainingAmount)}.`;
    }

    return {
      title,
      message,
      data: {
        categoryName,
        currentSpending: spending.totalSpent,
        budgetLimit,
        percentageUsed: spending.percentageUsed,
        remainingAmount: isExceeded ? undefined : spending.remainingAmount,
        exceededAmount: isExceeded ? spending.exceededAmount : undefined,
      },
    };
  }

  /**
   * Build HTML email for budget alert
   * 
   * @param notification - Notification payload
   * @returns HTML string
   */
  private static buildBudgetAlertEmailHtml(notification: NotificationPayload): string {
    const { data } = notification;
    const isExceeded = data.exceededAmount !== undefined;

    const statusColor = isExceeded ? '#DC2626' : '#F59E0B';
    const statusIcon = isExceeded ? '⚠️' : '⚡';

    return emailService['getEmailTemplate'](notification.title, `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
        <h2 style="color: ${statusColor}; margin: 0;">${notification.title}</h2>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">
        ${notification.message}
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Categoria:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.categoryName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Gasto Atual:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${this.formatCurrency(data.currentSpending)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Limite do Orçamento:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${this.formatCurrency(data.budgetLimit)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Percentual Usado:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${statusColor};">${data.percentageUsed.toFixed(1)}%</td>
          </tr>
          ${isExceeded ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Valor Excedido:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #DC2626;">${this.formatCurrency(data.exceededAmount!)}</td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 8px 0; color: #666;">Valor Restante:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10B981;">${this.formatCurrency(data.remainingAmount!)}</td>
          </tr>
          `}
        </table>
      </div>

      <p style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/budgets" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver Orçamentos
        </a>
      </p>

      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        ${isExceeded 
          ? 'Considere revisar seus gastos ou ajustar o limite do orçamento.' 
          : 'Fique atento aos seus gastos para não exceder o orçamento.'}
      </p>
    `);
  }

  /**
   * Get user by ID
   * 
   * @param userId - User ID
   * @returns User or null
   */
  private static async getUserById(userId: number): Promise<{ email: string | null; phone: string | null } | null> {
    try {
      const result = await db
        .select({
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }
}