import { Request, Response, NextFunction } from 'express';
import bcryptjs from "bcryptjs";
import { db } from "../db";
import { adminUsers, auditLogs } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
    interface Session {
      adminUserId?: number;
    }
  }
}

export const ADMIN_PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  PLANS_READ: 'plans:read',
  PLANS_WRITE: 'plans:write',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_WRITE: 'campaigns:write',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  ANALYTICS_READ: 'analytics:read',
  AUDIT_LOGS_READ: 'audit_logs:read',
  SECURITY_READ: 'security:read',
  SECURITY_WRITE: 'security:write',
} as const;

export async function isAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUserId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }

  try {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUserId));
    if (!admin || !admin.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Admin not found or inactive" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ message: "Authentication error" });
  }
}

export function requireAdminRole(role: 'admin' | 'super_admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    if (role === 'super_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: "Super admin role required" });
    }

    next();
  };
}

export function requireAdminPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    // Super admins have all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has specific permission
    if (!req.admin.permissions || !req.admin.permissions.includes(permission)) {
      return res.status(403).json({ message: `Permission required: ${permission}` });
    }

    next();
  };
}

export async function loginAdmin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    if (!admin || !admin.isActive || !await bcryptjs.compare(password, admin.password)) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    req.session.adminUserId = admin.id;
    const { password: _, ...adminWithoutPassword } = admin;
    res.json({ admin: adminWithoutPassword, message: "Login realizado com sucesso" });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function logoutAdmin(req: Request, res: Response) {
  req.session.destroy(() => {
    res.json({ message: "Logout realizado com sucesso" });
  });
}

export async function getCurrentAdmin(req: Request, res: Response) {
  try {
    if (!req.session?.adminUserId) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.session.adminUserId));
    if (!admin || !admin.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Admin not found or inactive" });
    }

    const { password: _, ...adminWithoutPassword } = admin;
    res.json(adminWithoutPassword);
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({ message: "Authentication error" });
  }
}

export async function logAdminAction(adminUserId: number, action: string, entityType?: string, entityId?: number, oldData?: any, newData?: any, ipAddress?: string, userAgent?: string) {
  try {
    await db.insert(auditLogs).values({
      userId: adminUserId,
      userType: 'admin',
      action,
      resource: entityType || 'unknown',
      resourceId: entityId?.toString(),
      metadata: JSON.stringify({ oldData, newData }),
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}