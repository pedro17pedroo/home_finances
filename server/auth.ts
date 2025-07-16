import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { loginSchema, registerSchema } from '@shared/schema';
import { z } from 'zod';
import { trackFailedLogin, isIPBlocked, logSecurityEvent } from './security-logger';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    user: {
      id: number;
      email: string | null;
      phone: string | null;
      firstName: string | null;
      lastName: string | null;
      subscriptionStatus: string;
      planType: string;
      organizationId: number | null;
      role: string;
    };
  }
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const user = req.session.user;
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
    return next();
  }
  
  return res.status(403).json({ message: 'Subscription required' });
};

export const requirePlan = (requiredPlan: 'basic' | 'premium' | 'enterprise') => {
  const planHierarchy = { basic: 1, premium: 2, enterprise: 3 };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = req.session.user;
    const userPlanLevel = planHierarchy[user.planType as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan];
    
    if (userPlanLevel >= requiredPlanLevel) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Upgrade required',
      requiredPlan,
      currentPlan: user.planType
    });
  };
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = loginSchema.parse(req.body);
    const clientIP = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';
    
    // Check if IP is blocked
    if (await isIPBlocked(clientIP)) {
      await logSecurityEvent({
        eventType: 'suspicious_activity',
        severity: 'high',
        description: `Tentativa de login de IP bloqueado: ${clientIP}`,
        ipAddress: clientIP,
        userAgent,
        details: { email: emailOrPhone }
      });
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    const user = await storage.getUserByEmailOrPhone(emailOrPhone);
    if (!user) {
      await trackFailedLogin(clientIP, userAgent, emailOrPhone);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await trackFailedLogin(clientIP, userAgent, emailOrPhone);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionStatus: user.subscriptionStatus || 'trialing',
      planType: user.planType || 'basic',
      organizationId: user.organizationId,
      role: user.role || 'member'
    };
    
    res.json({ 
      message: 'Login realizado com sucesso',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmailOrPhone(userData.email || userData.phone || '');
    if (existingUser) {
      return res.status(409).json({ message: 'Usuário já existe' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create user with trial period
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial
    
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      subscriptionStatus: 'trialing',
      planType: userData.planType || 'basic',
      trialEndsAt
    });

    // If user signs up for enterprise plan, create an organization
    if (userData.planType === 'enterprise') {
      const organization = await storage.createOrganization({
        name: `${userData.firstName} ${userData.lastName}'s Organization`,
        ownerId: user.id,
        planType: 'enterprise',
        subscriptionStatus: 'trialing',
        maxUsers: 10 // Enterprise plan allows 10 users
      });

      // Update user to be part of the organization and set as owner
      await storage.updateUser(user.id, {
        organizationId: organization.id,
        role: 'owner',
        planType: 'enterprise'
      });
    }
    
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      subscriptionStatus: user.subscriptionStatus || 'trialing',
      planType: user.planType || 'basic',
      organizationId: user.organizationId,
      role: user.role || 'member'
    };
    
    res.status(201).json({
      message: 'Conta criada com sucesso',
      user: req.session.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const logoutUser = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Erro ao fazer logout' });
    }
    res.json({ message: 'Logout realizado com sucesso' });
  });
};

export const getCurrentUser = (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  res.json(req.session.user);
};