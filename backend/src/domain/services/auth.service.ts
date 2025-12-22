import { UserRepository } from "../repositories/user.repository.js";
import { CategoryService } from "./category.service.js";
import { OrganizationService } from "./organization.service.js";
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

    // Create default categories for the new user
    try {
      await CategoryService.createDefaultCategoriesForUser(user.id);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Error creating default categories for user:', error);
    }

    // Create organization for the new user (they become the owner)
    try {
      const orgName = `${firstName} ${lastName}`.trim() || 'Minha Organização';
      await OrganizationService.createOrganization({
        name: orgName,
        ownerId: user.id,
      });
    } catch (error) {
      // Log error but don't fail registration
      console.error('Error creating organization for user:', error);
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

    return {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      planType: user.planType || "basic",
      subscriptionStatus: user.subscriptionStatus || "trialing",
      trialEndsAt: user.trialEndsAt,
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