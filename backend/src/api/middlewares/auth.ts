import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UnauthorizedError, BadRequestError } from "../../core/errors/app-error.js";
import { config } from "../../core/config/index.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";

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
    
    // Verify user still exists and is active
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