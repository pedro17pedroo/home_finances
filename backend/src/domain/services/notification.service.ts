import { LoanService } from "./loan.service.js";
import { DebtService } from "./debt.service.js";
import { SavingsGoalService } from "./savings-goal.service.js";
import { RecurringTransactionService } from "./recurring-transaction.service.js";
import { logger } from "../../core/utils/logger.js";

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

      // Armazenar notificações na memória (em produção, usar banco de dados)
      this.notifications.set(userId, notifications);

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
    // Gerar notificações atualizadas
    return await this.generateNotificationsForUser(userId);
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
}