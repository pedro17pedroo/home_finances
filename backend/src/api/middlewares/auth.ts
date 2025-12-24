import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UnauthorizedError, BadRequestError } from "../../core/errors/app-error.js";
import { config } from "../../core/config/index.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { AdminRepository } from "../../domain/repositories/admin.repository.js";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email?: string;
        phone?: string;
        planType: string;
        subscriptionStatus: string;
        organizationId?: number;
        role?: string;
      };
    }
  }
}

// Export type for controllers
export type AuthenticatedRequest = Request & {
  user: {
    id: number;
    email?: string;
    phone?: string;
    planType: string;
    subscriptionStatus: string;
    organizationId?: number;
    role?: string;
  };
};

export interface JWTPayload {
  userId: number;
  email?: string;
  phone?: string;
  planType: string;
  subscriptionStatus: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token required");
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    // Check if it's an admin user (planType === 'admin')
    if (decoded.planType === 'admin') {
      const admin = await AdminRepository.findAdminById(decoded.userId);
      if (!admin) {
        throw new UnauthorizedError("Admin not found");
      }
      if (!admin.isActive) {
        throw new UnauthorizedError("Admin account is disabled");
      }
      
      req.user = {
        id: admin.id,
        email: admin.email,
        planType: "admin",
        subscriptionStatus: "active",
      };
      
      return next();
    }
    
    // Verify regular user still exists and is active
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.user = {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      planType: user.planType || "basic",
      subscriptionStatus: user.subscriptionStatus || "trialing",
      organizationId: user.organizationId || undefined,
      role: user.role || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid token"));
    } else {
      next(error);
    }
  }
};

export const requirePlan = (requiredPlans: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!requiredPlans.includes(req.user.planType)) {
      return next(new BadRequestError("Plan upgrade required"));
    }

    next();
  };
};

export const requireActiveSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }

  const activeStatuses = ["active", "trialing"];
  if (!activeStatuses.includes(req.user.subscriptionStatus)) {
    return next(new BadRequestError("Active subscription required"));
  }

  next();
};

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload as any, config.JWT_SECRET as any, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as any);
};

export const generateRefreshToken = (userId: number): string => {
  return jwt.sign({ userId }, config.REFRESH_TOKEN_SECRET as any, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  } as any);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Middleware for admin-only routes (backoffice)
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    // Check if it's an admin user (planType === 'admin')
    if (decoded.planType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
};