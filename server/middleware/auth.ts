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

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: "Email/phone and password are required" });
    }

    // Find user by email or phone
    const [user] = await db.select().from(users).where(
      or(
        eq(users.email, emailOrPhone),
        eq(users.phone, emailOrPhone)
      )
    );

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    req.session.userId = user.id;
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, message: "Login realizado com sucesso" });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function registerUser(req: Request, res: Response) {
  try {
    const { email, phone, password, firstName, lastName, planType } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password é obrigatória" });
    }

    // Check if user already exists
    if (email) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe com este email" });
      }
    }

    if (phone) {
      const [existingUser] = await db.select().from(users).where(eq(users.phone, phone));
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe com este telefone" });
      }
    }

    const hashedPassword = await hashPassword(password);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

    const [newUser] = await db.insert(users).values({
      email,
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      planType: planType || 'basic',
      subscriptionStatus: 'trialing',
      trialEndsAt,
    }).returning();

    req.session.userId = newUser.id;
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, message: "Conta criada com sucesso" });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function logoutUser(req: Request, res: Response) {
  req.session.destroy(() => {
    res.json({ message: "Logout realizado com sucesso" });
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: "Authentication error" });
  }
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