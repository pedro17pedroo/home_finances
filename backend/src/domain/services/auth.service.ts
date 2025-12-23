import { UserRepository } from "../repositories/user.repository.js";
import { CategoryService } from "./category.service.js";
import { OrganizationService } from "./organization.service.js";
import { eq } from "drizzle-orm";
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  generateRefreshToken,
  type JWTPayload 
} from "../../api/middlewares/auth.js";
import { 
  BadRequestError, 
  UnauthorizedError, 
  ConflictError 
} from "../../core/errors/app-error.js";
import emailService from "../../infrastructure/email/email.service.js";
import type { InsertUser } from "../../core/database/schema.js";

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  planType?: 'basic' | 'premium' | 'enterprise';
}

export interface AuthResponse {
  user: {
    id: number;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    planType: string;
    subscriptionStatus: string;
    organizationId?: number;
    role?: string;
  };
  token: string;
  refreshToken: string;
}

export class AuthService {
  static async login(data: LoginRequest): Promise<AuthResponse> {
    const { emailOrPhone, password } = data;

    // Find user by email or phone
    const user = await UserRepository.findByEmailOrPhone(emailOrPhone);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // For members (non-owners), get plan info from organization
    let planType = user.planType || "basic";
    let subscriptionStatus = user.subscriptionStatus || "trialing";

    if (user.organizationId && user.role !== 'owner') {
      const { OrganizationRepository } = await import("../repositories/organization.repository.js");
      const organization = await OrganizationRepository.findById(user.organizationId);
      
      if (organization) {
        planType = organization.planType || planType;
        subscriptionStatus = organization.subscriptionStatus || subscriptionStatus;
        
        // Check for active subscription on the organization
        const { subscriptions } = await import("../../core/database/schema.js");
        const { desc } = await import("drizzle-orm");
        const { db } = await import("../../core/database/db.js");
        
        const [orgSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, user.organizationId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        
        if (orgSubscription) {
          if (orgSubscription.status === 'active') {
            subscriptionStatus = 'active';
          } else if (orgSubscription.status === 'trial') {
            subscriptionStatus = 'trialing';
          } else if (orgSubscription.status === 'expired') {
            subscriptionStatus = 'past_due';
          } else if (orgSubscription.status === 'cancelled') {
            subscriptionStatus = 'canceled';
          }
        }
      }
    }

    // Generate tokens
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      planType,
      subscriptionStatus,
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        planType,
        subscriptionStatus,
        organizationId: user.organizationId || undefined,
        role: user.role || undefined,
      },
      token,
      refreshToken,
    };
  }

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, phone, password, firstName, lastName, planType = "basic" } = data;

    // Validate that either email or phone is provided
    if (!email && !phone) {
      throw new BadRequestError("Email or phone is required");
    }

    // Check if user already exists
    if (email) {
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }
    }

    if (phone) {
      const existingUser = await UserRepository.findByPhone(phone);
      if (existingUser) {
        throw new ConflictError("User with this phone already exists");
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Set trial period (14 days)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create user
    const userData: InsertUser = {
      email,
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      planType,
      subscriptionStatus: "trialing",
      trialEndsAt,
    };

    const user = await UserRepository.create(userData);

    // Create organization for the new user FIRST (they become the owner)
    let organizationId: number | null = null;
    try {
      const orgName = `${firstName} ${lastName}`.trim() || 'Minha Organização';
      const organization = await OrganizationService.createOrganization({
        name: orgName,
        ownerId: user.id,
      });
      organizationId = organization.id;
    } catch (error) {
      // Log error but don't fail registration
      console.error('Error creating organization for user:', error);
    }

    // Create default categories for the new user/organization
    try {
      await CategoryService.createDefaultCategories(user.id, organizationId);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Error creating default categories for user:', error);
    }

    // Fetch updated user to get organizationId and role
    const updatedUser = await UserRepository.findById(user.id);

    // Send welcome email
    if (user.email) {
      emailService.sendWelcomeEmail(user.email, firstName).catch(err => {
        console.error('Error sending welcome email:', err);
      });
    }

    // Generate tokens
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      planType: user.planType || "basic",
      subscriptionStatus: user.subscriptionStatus || "trialing",
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        planType: user.planType || "basic",
        subscriptionStatus: user.subscriptionStatus || "trialing",
        organizationId: updatedUser?.organizationId || undefined,
        role: updatedUser?.role || 'owner',
      },
      token,
      refreshToken,
    };
  }

  static async getCurrentUser(userId: number) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // For members (non-owners), get plan info from organization
    let planType = user.planType || "basic";
    let subscriptionStatus = user.subscriptionStatus || "trialing";
    let trialEndsAt = user.trialEndsAt;

    if (user.organizationId && user.role !== 'owner') {
      // Import here to avoid circular dependency
      const { OrganizationRepository } = await import("../repositories/organization.repository.js");
      const organization = await OrganizationRepository.findById(user.organizationId);
      
      if (organization) {
        planType = organization.planType || planType;
        subscriptionStatus = organization.subscriptionStatus || subscriptionStatus;
        
        // Also check for active subscription on the organization
        const { subscriptions } = await import("../../core/database/schema.js");
        const { desc } = await import("drizzle-orm");
        const { db } = await import("../../core/database/db.js");
        
        const [orgSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, user.organizationId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        
        if (orgSubscription) {
          // Map subscription status to user subscription status
          if (orgSubscription.status === 'active') {
            subscriptionStatus = 'active';
          } else if (orgSubscription.status === 'trial') {
            subscriptionStatus = 'trialing';
            trialEndsAt = orgSubscription.trialEndsAt;
          } else if (orgSubscription.status === 'expired') {
            subscriptionStatus = 'past_due';
          } else if (orgSubscription.status === 'cancelled') {
            subscriptionStatus = 'canceled';
          }
        }
      }
    }

    return {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      planType,
      subscriptionStatus,
      trialEndsAt,
      organizationId: user.organizationId || undefined,
      role: user.role || undefined,
      createdAt: user.createdAt,
    };
  }

  static async updateProfile(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }
  ) {
    // Check if email/phone is already taken by another user
    if (data.email) {
      const existingUser = await UserRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Email is already taken");
      }
    }

    if (data.phone) {
      const existingUser = await UserRepository.findByPhone(data.phone);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Phone is already taken");
      }
    }

    const updatedUser = await UserRepository.update(userId, data);

    return {
      id: updatedUser.id,
      email: updatedUser.email || undefined,
      phone: updatedUser.phone || undefined,
      firstName: updatedUser.firstName || undefined,
      lastName: updatedUser.lastName || undefined,
      planType: updatedUser.planType || "basic",
      subscriptionStatus: updatedUser.subscriptionStatus || "trialing",
    };
  }

  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new BadRequestError("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await UserRepository.update(userId, { password: hashedPassword });

    return { message: "Password changed successfully" };
  }
}