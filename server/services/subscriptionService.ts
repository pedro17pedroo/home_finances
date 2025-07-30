import { db } from '../db';
import { users, paymentTransactions } from '@shared/schema';
import { eq, lt, and, gte } from 'drizzle-orm';
import { UserModel } from '../models/User';

export class SubscriptionService {
  /**
   * Daily job to check and update expired subscriptions
   */
  static async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      
      // Find trials that expired
      const expiredTrials = await db.select()
        .from(users)
        .where(
          and(
            eq(users.subscriptionStatus, 'trialing'),
            lt(users.trialEndsAt, now)
          )
        );

      console.log(`Found ${expiredTrials.length} expired trials`);

      // Update expired trials
      for (const user of expiredTrials) {
        await UserModel.update(user.id, { 
          subscriptionStatus: 'trial_expired' as any 
        });
        
        // Send expiration notification
        await this.sendExpirationNotification(user);
        console.log(`Updated user ${user.id} - trial expired`);
      }

      return {
        expiredTrials: expiredTrials.length,
        processed: true
      };
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Check users approaching trial expiration (3 days, 1 day)
   */
  static async checkUpcomingExpirations() {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      // Users expiring in 3 days
      const expiring3Days = await db.select()
        .from(users)
        .where(
          and(
            eq(users.subscriptionStatus, 'trialing'),
            gte(users.trialEndsAt, now),
            lt(users.trialEndsAt, threeDaysFromNow)
          )
        );

      // Users expiring in 1 day  
      const expiring1Day = await db.select()
        .from(users)
        .where(
          and(
            eq(users.subscriptionStatus, 'trialing'),
            gte(users.trialEndsAt, now),
            lt(users.trialEndsAt, oneDayFromNow)
          )
        );

      // Send notifications
      for (const user of expiring3Days) {
        await this.sendUpcomingExpirationNotification(user, 3);
      }

      for (const user of expiring1Day) {
        await this.sendUpcomingExpirationNotification(user, 1);
      }

      return {
        expiring3Days: expiring3Days.length,
        expiring1Day: expiring1Day.length
      };
    } catch (error) {
      console.error('Error checking upcoming expirations:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after payment confirmation
   */
  static async activateSubscription(userId: number, planType: 'basic' | 'premium' | 'enterprise', durationMonths: number = 1) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

      await UserModel.update(userId, {
        subscriptionStatus: 'active',
        planType,
        trialEndsAt: expiresAt // Reuse this field for subscription expiration
      });

      // Send activation confirmation
      const user = await UserModel.findById(userId);
      if (user) {
        await this.sendActivationNotification(user, planType, expiresAt);
      }

      return { success: true, expiresAt };
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Send expiration notification
   */
  private static async sendExpirationNotification(user: any) {
    console.log(`Sending expiration notification to user ${user.id} (${user.email})`);
    
    // TODO: Implement email/SMS service
    // This is where you would integrate with:
    // - SendGrid, Mailgun, or AWS SES for emails
    // - Twilio or local SMS provider for SMS
    // - WhatsApp Business API for WhatsApp messages
    
    const notification = {
      type: 'trial_expired',
      userId: user.id,
      email: user.email,
      phone: user.phone,
      message: `Seu período de teste expirou. Escolha um plano para continuar usando o sistema.`,
      ctaUrl: '/upgrade',
      sentAt: new Date()
    };

    // For now, just log - replace with actual notification service
    console.log('NOTIFICATION:', notification);
  }

  /**
   * Send upcoming expiration notification
   */
  private static async sendUpcomingExpirationNotification(user: any, daysLeft: number) {
    console.log(`Sending ${daysLeft}-day warning to user ${user.id} (${user.email})`);
    
    const notification = {
      type: 'trial_warning',
      userId: user.id,
      email: user.email,
      phone: user.phone,
      daysLeft,
      message: `Seu período de teste expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}. Escolha um plano para continuar.`,
      ctaUrl: '/upgrade',
      sentAt: new Date()
    };

    console.log('NOTIFICATION:', notification);
  }

  /**
   * Send activation notification
   */
  private static async sendActivationNotification(user: any, planType: string, expiresAt: Date) {
    console.log(`Sending activation notification to user ${user.id} (${user.email})`);
    
    const notification = {
      type: 'subscription_activated',
      userId: user.id,
      email: user.email,
      phone: user.phone,
      planType,
      expiresAt,
      message: `Sua subscrição ${planType} foi ativada com sucesso! Válida até ${expiresAt.toLocaleDateString()}.`,
      sentAt: new Date()
    };

    console.log('NOTIFICATION:', notification);
  }

  /**
   * Get subscription status for user
   */
  static async getSubscriptionStatus(userId: number) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const isTrialActive = user.subscriptionStatus === 'trialing' && 
                         user.trialEndsAt && 
                         new Date(user.trialEndsAt) > now;

    const isSubscriptionActive = user.subscriptionStatus === 'active' && 
                                user.trialEndsAt && 
                                new Date(user.trialEndsAt) > now;

    return {
      status: user.subscriptionStatus,
      planType: user.planType,
      expiresAt: user.trialEndsAt,
      isActive: isTrialActive || isSubscriptionActive,
      daysLeft: user.trialEndsAt ? 
        Math.ceil((new Date(user.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    };
  }
}