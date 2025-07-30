import { Request, Response, NextFunction } from 'express';
import bcryptjs from "bcryptjs";
import { db } from "../db";
import { users, securityLogs, blockedIPs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { getSecurityStats, blockIP as blockIPUtil } from "../security-logger";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: "Authentication error" });
  }
}

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { subscriptionStatus, trialEndsAt } = req.user;
  const now = new Date();

  // Check if subscription is active
  if (subscriptionStatus === 'active') {
    return next();
  }

  // Check if still in trial period
  if (subscriptionStatus === 'trialing' && trialEndsAt && new Date(trialEndsAt) > now) {
    return next();
  }

  return res.status(403).json({ 
    message: "Active subscription required",
    subscriptionStatus,
    trialEndsAt 
  });
}

export function requirePlan(minPlan: 'basic' | 'premium' | 'enterprise') {
  const planHierarchy = { basic: 1, premium: 2, enterprise: 3 };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPlanLevel = planHierarchy[req.user.planType as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[minPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        message: `${minPlan} plan or higher required`,
        currentPlan: req.user.planType,
        requiredPlan: minPlan
      });
    }

    next();
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}