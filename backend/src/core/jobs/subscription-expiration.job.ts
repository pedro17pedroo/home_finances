import { subscriptionService } from "../../domain/services/subscription.service.js";
import { db } from "../database/db.js";
import { subscriptionNotifications, subscriptions, users } from "../database/schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export class SubscriptionExpirationJob {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly INTERVAL_HOURS = 24; // Execute every 24 hours

  /**
   * Start the subscription expiration job
   */
  static start(): void {
    if (this.intervalId) {
      logger.warn("Subscription expiration job is already running");
      return;
    }

    logger.info("Starting subscription expiration job");
    
    // Execute immediately
    this.executeJob();
    
    // Schedule future executions
    this.intervalId = setInterval(() => {
      this.executeJob();
    }, this.INTERVAL_HOURS * 60 * 60 * 1000);

    logger.info(`Subscription expiration job scheduled to run every ${this.INTERVAL_HOURS} hours`);
  }

  /**
   * Stop the subscription expiration job
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Subscription expiration job stopped");
    }
  }

  /**
   * Execute the subscription expiration processing
   */
  private static async executeJob(): Promise<void> {
    try {
      logger.info("Executing subscription expiration job");
      
      // 1. Mark expired subscriptions
      const expiredCount = await subscriptionService.markExpiredSubscriptions();
      logger.info(`Marked ${expiredCount} subscriptions as expired`);

      // 2. Create notifications for expiring subscriptions (7, 3, 1 days)
      await this.createExpirationNotifications();

      // 3. Create notifications for expiring trials (3, 1 days)
      await this.createTrialNotifications();

      logger.info("Subscription expiration job completed successfully");
    } catch (error) {
      logger.error("Error in subscription expiration job:", error);
    }
  }

  /**
   * Create notifications for subscriptions expiring soon
   */
  private static async createExpirationNotifications(): Promise<void> {
    const notificationDays = [7, 3, 1];

    for (const days of notificationDays) {
      try {
        const expiringSubs = await subscriptionService.getExpiringSubscriptions(days);
        
        for (const sub of expiringSubs) {
          // Check if notification already exists for this subscription and day
          const existingNotification = await this.checkExistingNotification(
            sub.id,
            'expiring',
            days
          );

          if (!existingNotification) {
            await db.insert(subscriptionNotifications).values({
              subscriptionId: sub.id,
              userId: sub.userId,
              type: 'expiring',
              daysBefore: days,
              channel: 'email',
              status: 'pending',
            });

            logger.info(`Created expiration notification for subscription ${sub.id} (${days} days)`);
          }
        }
      } catch (error) {
        logger.error(`Error creating ${days}-day expiration notifications:`, error);
      }
    }
  }

  /**
   * Create notifications for trials ending soon
   */
  private static async createTrialNotifications(): Promise<void> {
    const notificationDays = [3, 1];

    for (const days of notificationDays) {
      try {
        const expiringTrials = await subscriptionService.getExpiringTrials(days);
        
        for (const sub of expiringTrials) {
          // Check if notification already exists
          const existingNotification = await this.checkExistingNotification(
            sub.id,
            'trial_ending',
            days
          );

          if (!existingNotification) {
            await db.insert(subscriptionNotifications).values({
              subscriptionId: sub.id,
              userId: sub.userId,
              type: 'trial_ending',
              daysBefore: days,
              channel: 'email',
              status: 'pending',
            });

            logger.info(`Created trial ending notification for subscription ${sub.id} (${days} days)`);
          }
        }
      } catch (error) {
        logger.error(`Error creating ${days}-day trial notifications:`, error);
      }
    }
  }

  /**
   * Check if a notification already exists
   */
  private static async checkExistingNotification(
    subscriptionId: number,
    type: string,
    daysBefore: number
  ): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(subscriptionNotifications)
      .where(
        and(
          eq(subscriptionNotifications.subscriptionId, subscriptionId),
          eq(subscriptionNotifications.type, type),
          eq(subscriptionNotifications.daysBefore, daysBefore)
        )
      )
      .limit(1);

    return !!existing;
  }

  /**
   * Run the job manually (for testing)
   */
  static async runManually(): Promise<void> {
    logger.info("Running subscription expiration job manually");
    await this.executeJob();
  }
}
