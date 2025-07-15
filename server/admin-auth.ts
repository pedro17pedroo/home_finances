import { Request, Response, NextFunction } from 'express';
import { adminUsers, auditLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';
import bcrypt from 'bcryptjs';

// Extend session interface for admin users
declare module 'express-session' {
  interface SessionData {
    adminUserId?: number;
    adminUser?: {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      permissions: string[];
    };
  }
}

// Admin authentication middleware
export const isAdminAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.adminUserId) {
    return next();
  }
  return res.status(401).json({ message: 'Admin authentication required' });
};

// Admin role check middleware
export const requireAdminRole = (requiredRole: 'super_admin' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.adminUserId) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }
    
    const user = req.session.adminUser;
    if (!user) {
      return res.status(401).json({ message: 'Admin session invalid' });
    }
    
    // Super admin can access everything
    if (user.role === 'super_admin') {
      return next();
    }
    
    // Check if user has required role
    if (user.role !== requiredRole) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        requiredRole,
        currentRole: user.role
      });
    }
    
    return next();
  };
};

// Admin permission check middleware
export const requireAdminPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.adminUserId) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }
    
    const user = req.session.adminUser;
    if (!user) {
      return res.status(401).json({ message: 'Admin session invalid' });
    }
    
    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return next();
    }
    
    // Check if user has required permission
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        requiredPermission: permission
      });
    }
    
    return next();
  };
};

// Hash password
export const hashAdminPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyAdminPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Admin login
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Find admin user
    const adminUser = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    
    if (!adminUser.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = adminUser[0];
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account disabled' });
    }
    
    // Verify password
    const isValidPassword = await verifyAdminPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    
    // Create session
    req.session.adminUserId = user.id;
    req.session.adminUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'admin',
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };
    
    // Log login
    await logAdminAction(user.id, 'login', 'admin_user', user.id, null, null, req);
    
    res.json({ 
      message: 'Login successful',
      user: req.session.adminUser
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin logout
export const logoutAdmin = (req: Request, res: Response) => {
  try {
    const adminUserId = req.session.adminUserId;
    
    // Log logout
    if (adminUserId) {
      logAdminAction(adminUserId, 'logout', 'admin_user', adminUserId, null, null, req);
    }
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (error: any) {
    console.error('Admin logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current admin user
export const getCurrentAdmin = (req: Request, res: Response) => {
  try {
    if (!req.session?.adminUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.json(req.session.adminUser);
  } catch (error: any) {
    console.error('Get current admin error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Audit logging helper
export const logAdminAction = async (
  adminUserId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  oldData: any,
  newData: any,
  req: Request
) => {
  try {
    await db.insert(auditLogs).values({
      adminUserId,
      action,
      entityType,
      entityId,
      oldData,
      newData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Admin permissions definition
export const ADMIN_PERMISSIONS = {
  PLANS: {
    VIEW: 'plans.view',
    CREATE: 'plans.create',
    UPDATE: 'plans.update',
    DELETE: 'plans.delete',
    MANAGE_PRICING: 'plans.manage_pricing'
  },
  USERS: {
    VIEW: 'users.view',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    MANAGE_SUBSCRIPTIONS: 'users.manage_subscriptions'
  },
  PAYMENTS: {
    VIEW: 'payments.view',
    MANAGE_METHODS: 'payments.manage_methods',
    PROCESS_REFUNDS: 'payments.process_refunds'
  },
  CAMPAIGNS: {
    VIEW: 'campaigns.view',
    CREATE: 'campaigns.create',
    UPDATE: 'campaigns.update',
    DELETE: 'campaigns.delete'
  },
  CONTENT: {
    VIEW: 'content.view',
    MANAGE_LANDING: 'content.manage_landing',
    MANAGE_LEGAL: 'content.manage_legal'
  },
  SYSTEM: {
    VIEW_SETTINGS: 'system.view_settings',
    MANAGE_SETTINGS: 'system.manage_settings',
    VIEW_LOGS: 'system.view_logs'
  }
};