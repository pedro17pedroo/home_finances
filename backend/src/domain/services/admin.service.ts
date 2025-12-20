import { AdminRepository } from "../repositories/admin.repository.js";
import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from "../../api/middlewares/auth.js";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../../core/errors/app-error.js";
import { logger } from "../../core/utils/logger.js";
import type { InsertAdminUser, InsertPlan, InsertLandingContent, InsertLegalContent } from "../../core/database/schema.js";

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  admin: {
    id: number;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
  token: string;
  refreshToken: string;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  price: number;
  features: string[];
  maxAccounts: number;
  maxTransactions: number;
  isActive: boolean;
}

export class AdminService {
  /**
   * Login de administrador
   */
  static async login(data: AdminLoginRequest): Promise<AdminAuthResponse> {
    const { email, password } = data;

    const admin = await AdminRepository.findAdminByEmail(email);
    if (!admin) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    if (!admin.isActive) {
      throw new UnauthorizedError("Conta de administrador desativada");
    }

    const token = generateToken({
      userId: admin.id,
      email: admin.email,
      planType: 'admin',
      subscriptionStatus: 'active'
    });
    
    const refreshToken = generateRefreshToken(admin.id);

    // Log da ação
    await AdminRepository.createAuditLog(admin.id, 'admin_login');

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName
      },
      token,
      refreshToken
    };
  }

  /**
   * Criar novo administrador
   */
  static async createAdmin(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }, createdBy: number): Promise<void> {
    const existingAdmin = await AdminRepository.findAdminByEmail(data.email);
    if (existingAdmin) {
      throw new BadRequestError("Email já está em uso");
    }

    const passwordHash = await hashPassword(data.password);

    const adminData: InsertAdminUser = {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'admin',
      isActive: true
    };

    const newAdmin = await AdminRepository.createAdmin(adminData);

    // Log da ação
    await AdminRepository.createAuditLog(createdBy, 'admin_created', 'admin', newAdmin.id, {
      email: data.email,
      role: data.role
    });

    logger.info(`Novo administrador criado: ${data.email}`);
  }

  /**
   * Gestão de Planos
   */
  static async getAllPlans() {
    return await AdminRepository.getAllPlans();
  }

  static async createPlan(data: CreatePlanRequest, createdBy: number) {
    const planData: InsertPlan = {
      name: data.name,
      description: data.description,
      price: data.price.toString(),
      features: JSON.stringify(data.features),
      maxAccounts: data.maxAccounts,
      maxTransactions: data.maxTransactions,
      isActive: data.isActive
    };

    const plan = await AdminRepository.createPlan(planData);

    // Log da ação
    await AdminRepository.createAuditLog(createdBy, 'plan_created', 'plan', plan.id, data);

    return plan;
  }

  static async updatePlan(planId: number, data: Partial<CreatePlanRequest>, updatedBy: number) {
    const updateData: Partial<InsertPlan> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price.toString();
    if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
    if (data.maxAccounts !== undefined) updateData.maxAccounts = data.maxAccounts;
    if (data.maxTransactions !== undefined) updateData.maxTransactions = data.maxTransactions;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const plan = await AdminRepository.updatePlan(planId, updateData);
    if (!plan) {
      throw new NotFoundError("Plano não encontrado");
    }

    // Log da ação
    await AdminRepository.createAuditLog(updatedBy, 'plan_updated', 'plan', planId, data);

    return plan;
  }

  static async deletePlan(planId: number, deletedBy: number) {
    const success = await AdminRepository.deletePlan(planId);
    if (!success) {
      throw new NotFoundError("Plano não encontrado");
    }

    // Log da ação
    await AdminRepository.createAuditLog(deletedBy, 'plan_deleted', 'plan', planId);
  }

  /**
   * Gestão de Utilizadores
   */
  static async getAllUsers(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await AdminRepository.getAllUsers(limit, offset);
  }

  static async getUserStats() {
    return await AdminRepository.getUserStats();
  }

  /**
   * Gestão de Conteúdo da Landing Page
   */
  static async getLandingContent() {
    return await AdminRepository.getLandingContent();
  }

  static async updateLandingContent(section: string, data: {
    title?: string;
    content?: string;
    metadata?: any;
  }, updatedBy: number) {
    const updateData: Partial<InsertLandingContent> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const content = await AdminRepository.updateLandingContent(section, updateData);

    // Log da ação
    await AdminRepository.createAuditLog(updatedBy, 'landing_content_updated', 'landing_content', undefined, {
      section,
      ...data
    });

    return content;
  }

  /**
   * Gestão de Conteúdo Legal
   */
  static async getLegalContent() {
    return await AdminRepository.getLegalContent();
  }

  static async updateLegalContent(type: string, data: {
    title?: string;
    content?: string;
    version?: string;
  }, updatedBy: number) {
    const updateData: Partial<InsertLegalContent> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.version !== undefined) updateData.version = data.version;

    const content = await AdminRepository.updateLegalContent(type, updateData);

    // Log da ação
    await AdminRepository.createAuditLog(updatedBy, 'legal_content_updated', 'legal_content', undefined, {
      type,
      ...data
    });

    return content;
  }

  /**
   * Logs de Auditoria
   */
  static async getAuditLogs(page: number = 1, limit: number = 100) {
    const offset = (page - 1) * limit;
    return await AdminRepository.getAuditLogs(limit, offset);
  }

  /**
   * Dashboard Analytics
   */
  static async getDashboardStats() {
    const userStats = await this.getUserStats();
    const plans = await this.getAllPlans();
    
    return {
      users: userStats,
      plans: {
        total: plans.length,
        active: plans.filter(p => p.isActive).length,
        list: plans
      },
      revenue: {
        // TODO: Implementar cálculos de receita baseados em pagamentos
        monthly: 0,
        total: 0
      }
    };
  }
}