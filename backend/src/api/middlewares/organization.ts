import { Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/db.js';
import { users, organizations } from '../../core/database/schema.js';
import { eq } from 'drizzle-orm';

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      organizationId?: number;
      organization?: {
        id: number;
        name: string;
        ownerId: number;
        planType: string;
        subscriptionStatus: string;
        maxUsers: number;
      };
      userRole?: string; // 'owner', 'admin', 'member'
    }
  }
}

/**
 * Middleware to add organization context to the request
 * Must be used after the authenticate middleware
 */
export async function organizationContext(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    
    if (!user || !user.id) {
      return next();
    }

    // Get user with organization info
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (!userData) {
      return next();
    }

    // If user has an organization, load it
    if (userData.organizationId) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, userData.organizationId));

      if (org) {
        req.organizationId = org.id;
        req.organization = {
          id: org.id,
          name: org.name,
          ownerId: org.ownerId,
          planType: org.planType || 'basic',
          subscriptionStatus: org.subscriptionStatus || 'trialing',
          maxUsers: org.maxUsers || 1,
        };
        req.userRole = userData.role || 'member';
      }
    }

    next();
  } catch (error) {
    console.error('Organization context middleware error:', error);
    next();
  }
}

/**
 * Middleware to require organization context
 * Returns 403 if user doesn't belong to an organization
 */
export function requireOrganization(req: Request, res: Response, next: NextFunction) {
  if (!req.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Você precisa pertencer a uma organização para acessar este recurso',
    });
  }
  next();
}

/**
 * Middleware to require owner or admin role
 */
export function requireOrgAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Você precisa pertencer a uma organização para acessar este recurso',
    });
  }

  if (req.userRole !== 'owner' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Você não tem permissão para realizar esta ação',
    });
  }

  next();
}

/**
 * Middleware to require owner role only
 */
export function requireOrgOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.organizationId) {
    return res.status(403).json({
      success: false,
      message: 'Você precisa pertencer a uma organização para acessar este recurso',
    });
  }

  if (req.userRole !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Apenas o proprietário da organização pode realizar esta ação',
    });
  }

  next();
}

/**
 * Helper function to get organization ID from request
 * Falls back to user ID for backward compatibility during migration
 */
export function getOrganizationId(req: Request): number | null {
  return req.organizationId || null;
}

/**
 * Helper function to get user ID from request
 */
export function getUserId(req: Request): number | null {
  return (req as any).user?.id || null;
}
