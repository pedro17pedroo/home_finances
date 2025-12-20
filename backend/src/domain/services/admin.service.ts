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
  static async getAllUsers(page: number = 1, limit: number = 50, search?: string, status?: string) {
    const offset = (page - 1) * limit;
    return await AdminRepository.getAllUsers(limit, offset, search, status);
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
        monthly: 8500000,
        total: 45000000,
        growth: 12.5
      },
      subscriptions: {
        active: 850,
        trial: 200,
        cancelled: 50
      },
      payments: {
        pending: 15,
        completed: 320,
        failed: 5
      }
    };
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId: number, isActive: boolean) {
    await AdminRepository.updateUserStatus(userId, isActive);
    logger.info(`User ${userId} status updated to ${isActive}`);
  }

  /**
   * Payments Management
   */
  static async getPayments(status?: string) {
    return await AdminRepository.getPayments(status);
  }

  static async approvePayment(paymentId: number, adminId: number) {
    await AdminRepository.updatePaymentStatus(paymentId, 'paid');
    await AdminRepository.createAuditLog(adminId, 'payment_approved', 'payment', paymentId);
    logger.info(`Payment ${paymentId} approved by admin ${adminId}`);
  }

  static async rejectPayment(paymentId: number, adminId: number) {
    await AdminRepository.updatePaymentStatus(paymentId, 'failed');
    await AdminRepository.createAuditLog(adminId, 'payment_rejected', 'payment', paymentId);
    logger.info(`Payment ${paymentId} rejected by admin ${adminId}`);
  }

  /**
   * Security Management
   */
  static async getSecurityEvents() {
    return await AdminRepository.getSecurityEvents();
  }

  static async resolveSecurityEvent(eventId: number, adminId: number) {
    await AdminRepository.resolveSecurityEvent(eventId, adminId);
    await AdminRepository.createAuditLog(adminId, 'security_event_resolved', 'security_event', eventId);
  }

  static async getBlockedIPs() {
    return await AdminRepository.getBlockedIPs();
  }

  static async blockIP(data: { ipAddress: string; reason: string; expiresAt?: string }, adminId: number) {
    await AdminRepository.blockIP(data, adminId);
    await AdminRepository.createAuditLog(adminId, 'ip_blocked', 'blocked_ip', undefined, data);
    logger.info(`IP ${data.ipAddress} blocked by admin ${adminId}`);
  }

  static async unblockIP(ipId: number) {
    await AdminRepository.unblockIP(ipId);
    logger.info(`IP ${ipId} unblocked`);
  }

  /**
   * Notifications Management
   */
  static async getAdminNotifications() {
    return await AdminRepository.getAdminNotifications();
  }

  static async sendNotification(data: { title: string; message: string; type: string; targetType: string }, adminId: number) {
    await AdminRepository.createNotification(data);
    await AdminRepository.createAuditLog(adminId, 'notification_sent', 'notification', undefined, data);
    logger.info(`Notification sent by admin ${adminId}`);
  }

  static async deleteNotification(notificationId: number) {
    await AdminRepository.deleteNotification(notificationId);
  }

  /**
   * Settings Management
   */
  static async getSettings() {
    return await AdminRepository.getSettings();
  }

  static async updateSettings(data: any, adminId: number) {
    await AdminRepository.updateSettings(data);
    await AdminRepository.createAuditLog(adminId, 'settings_updated', 'settings', undefined, data);
    logger.info(`Settings updated by admin ${adminId}`);
  }

  /**
   * Reports
   */
  static async getReports(period: string) {
    return {
      revenue: [
        { month: 'Jan', value: 4200000 },
        { month: 'Fev', value: 5100000 },
        { month: 'Mar', value: 4800000 },
        { month: 'Abr', value: 6200000 },
        { month: 'Mai', value: 7100000 },
        { month: 'Jun', value: 8500000 },
      ],
      planDistribution: [
        { name: 'Gratuito', value: 450 },
        { name: 'Básico', value: 380 },
        { name: 'Premium', value: 220 },
        { name: 'Enterprise', value: 50 },
      ],
      paymentMethods: [
        { method: 'E-Kwanza', count: 320 },
        { method: 'Multicaixa Express', count: 280 },
        { method: 'Referência', count: 150 },
      ],
      summary: {
        totalRevenue: 35900000,
        totalUsers: 1100,
        activeSubscriptions: 650,
        conversionRate: 58.5,
      },
    };
  }

  /**
   * Content Management
   */
  static async getContentByType(type: string) {
    return await AdminRepository.getContentByType(type);
  }

  static async updateContentById(contentId: number, data: { content: string }, adminId: number) {
    await AdminRepository.updateContentById(contentId, data);
    await AdminRepository.createAuditLog(adminId, 'content_updated', 'content', contentId, data);
  }
}