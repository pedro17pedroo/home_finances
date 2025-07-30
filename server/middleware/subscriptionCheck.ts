import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export async function checkSubscriptionStatus(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  try {
    // Get fresh user data to check current subscription status
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const now = new Date();
    
    // Check if trial has expired
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt && new Date(user.trialEndsAt) < now) {
      // Auto-update status to trial_expired
      await UserModel.update(user.id, { 
        subscriptionStatus: 'trial_expired' as any 
      });
      
      return res.status(403).json({ 
        message: "Trial period expired", 
        action: "upgrade_required",
        trialEndedAt: user.trialEndsAt,
        redirectTo: "/upgrade"
      });
    }

    // Check if subscription is past due or canceled
    if (['trial_expired', 'past_due', 'canceled'].includes(user.subscriptionStatus || '')) {
      return res.status(403).json({ 
        message: "Subscription required", 
        action: "subscription_required",
        status: user.subscriptionStatus,
        redirectTo: "/upgrade"
      });
    }

    // Update user in request with fresh data
    req.user = user;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next(); // Allow request to continue on error
  }
}

export function requireActiveSubscriptionStrict(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { subscriptionStatus, trialEndsAt } = req.user;
  const now = new Date();

  // Allow active subscriptions
  if (subscriptionStatus === 'active') {
    return next();
  }

  // Allow valid trials
  if (subscriptionStatus === 'trialing' && trialEndsAt && new Date(trialEndsAt) > now) {
    return next();
  }

  // Block everything else
  return res.status(403).json({ 
    message: "Active subscription required",
    subscriptionStatus,
    trialEndsAt,
    action: "upgrade_required",
    redirectTo: "/upgrade"
  });
}