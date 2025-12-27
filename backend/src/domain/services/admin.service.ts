import { AdminRepository } from "../repositories/admin.repository.js";
import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from "../../api/middlewares/auth.js";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../../core/errors/app-error.js";
import { logger } from "../../core/utils/logger.js";
import emailService from "../../infrastructure/email/email.service.js";
import crypto from "crypto";
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
  type: 'basic' | 'premium' | 'enterprise';
  description?: string;
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

    const isValidPassword = await verifyPassword(password, admin.password);
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

    // Atualizar último login
    await AdminRepository.updateLastLogin(admin.id);

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
   * Recuperação de senha - enviar email
   */
  static async forgotPassword(email: string): Promise<void> {
    const admin = await AdminRepository.findAdminByEmail(email);
    
    // Não revelar se o email existe ou não
    if (!admin) {
      logger.info(`Password reset requested for non-existent admin email: ${email}`);
      return;
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token no repositório
    await AdminRepository.savePasswordResetToken(admin.id, resetToken, resetTokenExpiry);

    // Enviar email
    const resetUrl = `${process.env.BACKOFFICE_URL || process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await emailService.sendEmail({
      to: admin.email,
      subject: 'Redefinir Senha - Backoffice FinanceControl',
      html: emailService['getEmailTemplate']('Recuperação de Senha', `
        <h2>Olá ${admin.firstName || 'Administrador'},</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta de administrador no FinanceControl.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p style="margin-top: 30px;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Redefinir Senha
          </a>
        </p>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Este link expira em 1 hora.
        </p>
        <p style="color: #999; font-size: 12px;">
          Se não solicitou a redefinição de senha, pode ignorar este email.
        </p>
      `)
    });

    logger.info(`Password reset email sent to admin: ${email}`);
  }

  /**
   * Redefinir senha com token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const admin = await AdminRepository.findAdminByResetToken(token);
    
    if (!admin) {
      throw new BadRequestError("Token inválido ou expirado");
    }

    // Hash da nova senha
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha e limpar token
    await AdminRepository.updateAdminPassword(admin.id, passwordHash);

    // Enviar email de confirmação
    await emailService.sendEmail({
      to: admin.email,
      subject: 'Senha Alterada - Backoffice FinanceControl',
      html: emailService['getEmailTemplate']('Senha Alterada', `
        <h2>Olá ${admin.firstName || 'Administrador'},</h2>
        <p>A sua senha foi alterada com sucesso.</p>
        <p>Se não foi você que fez esta alteração, contacte-nos imediatamente.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.BACKOFFICE_URL || process.env.FRONTEND_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Iniciar Sessão
          </a>
        </p>
      `)
    });

    logger.info(`Password reset completed for admin: ${admin.email}`);
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
      password: passwordHash,
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
    // Log received data for debugging
    console.log('Creating plan with data:', JSON.stringify(data));
    
    // Validate plan type
    const validTypes = ['basic', 'premium', 'enterprise'];
    if (!data.type || !validTypes.includes(data.type)) {
      console.log('Invalid type received:', data.type);
      throw new BadRequestError(`Tipo de plano inválido: "${data.type}". Use: ${validTypes.join(', ')}`);
    }

    const planData: InsertPlan = {
      name: data.name,
      type: data.type,
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
    if (data.type !== undefined) updateData.type = data.type;
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
   * Gestão de Utilizadores (Clientes)
   */
  static async getAllUsers(page: number = 1, limit: number = 50, search?: string, status?: string, plan?: string) {
    const offset = (page - 1) * limit;
    return await AdminRepository.getAllUsers(limit, offset, search, status, plan);
  }

  static async getUserById(userId: number) {
    return await AdminRepository.getUserById(userId);
  }

  static async updateUser(userId: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    planType?: string;
    subscriptionStatus?: string;
  }, updatedBy: number) {
    const user = await AdminRepository.updateUser(userId, data);
    if (!user) {
      throw new NotFoundError("Utilizador não encontrado");
    }

    await AdminRepository.createAuditLog(updatedBy, 'user_updated', 'user', userId, data);
    return user;
  }

  static async deleteUser(userId: number, deletedBy: number) {
    const success = await AdminRepository.deleteUser(userId);
    if (!success) {
      throw new NotFoundError("Utilizador não encontrado");
    }

    await AdminRepository.createAuditLog(deletedBy, 'user_deleted', 'user', userId);
  }

  static async getUserStats() {
    return await AdminRepository.getUserStats();
  }

  /**
   * Gestão de Administradores
   */
  static async getAllAdmins() {
    return await AdminRepository.getAllAdmins();
  }

  static async getAdminById(adminId: number) {
    return await AdminRepository.findAdminById(adminId);
  }

  static async updateAdmin(adminId: number, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  }, updatedBy: number) {
    // Check if email is being changed and if it's already in use
    if (data.email) {
      const existingAdmin = await AdminRepository.findAdminByEmail(data.email);
      if (existingAdmin && existingAdmin.id !== adminId) {
        throw new BadRequestError("Email já está em uso");
      }
    }

    const admin = await AdminRepository.updateAdmin(adminId, data);
    if (!admin) {
      throw new NotFoundError("Administrador não encontrado");
    }

    await AdminRepository.createAuditLog(updatedBy, 'admin_updated', 'admin', adminId, data);
    return admin;
  }

  static async toggleAdminStatus(adminId: number, isActive: boolean, updatedBy: number) {
    // Prevent deactivating yourself
    if (adminId === updatedBy && !isActive) {
      throw new BadRequestError("Não pode desativar a sua própria conta");
    }

    const admin = await AdminRepository.toggleAdminStatus(adminId, isActive);
    if (!admin) {
      throw new NotFoundError("Administrador não encontrado");
    }

    await AdminRepository.createAuditLog(updatedBy, isActive ? 'admin_activated' : 'admin_deactivated', 'admin', adminId);
    return admin;
  }

  static async deleteAdmin(adminId: number, deletedBy: number) {
    // Prevent deleting yourself
    if (adminId === deletedBy) {
      throw new BadRequestError("Não pode eliminar a sua própria conta");
    }

    const success = await AdminRepository.deleteAdmin(adminId);
    if (!success) {
      throw new NotFoundError("Administrador não encontrado");
    }

    await AdminRepository.createAuditLog(deletedBy, 'admin_deleted', 'admin', adminId);
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
    // Get real stats from database
    const dashboardStats = await AdminRepository.getDashboardStats();
    return dashboardStats;
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
    return await AdminRepository.getReports(period);
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

  /**
   * Payment Methods Management
   */
  static async getPaymentMethods() {
    return await AdminRepository.getPaymentMethods();
  }

  static async updatePaymentMethod(methodId: number, data: any) {
    const method = await AdminRepository.updatePaymentMethod(methodId, data);
    if (!method) {
      throw new NotFoundError("Método de pagamento não encontrado");
    }
    return method;
  }

  static async togglePaymentMethod(methodId: number, isActive: boolean) {
    const method = await AdminRepository.togglePaymentMethod(methodId, isActive);
    if (!method) {
      throw new NotFoundError("Método de pagamento não encontrado");
    }
    return method;
  }

  // Banks Management
  static async getBanks() {
    return AdminRepository.getBanks();
  }

  static async createBank(data: {
    code: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
    swiftCode?: string;
    country?: string;
    displayOrder?: number;
  }) {
    return AdminRepository.createBank(data);
  }

  static async updateBank(bankId: number, data: {
    code?: string;
    name?: string;
    shortName?: string;
    logoUrl?: string;
    swiftCode?: string;
    country?: string;
    displayOrder?: number;
  }) {
    const bank = await AdminRepository.updateBank(bankId, data);
    if (!bank) {
      throw new NotFoundError("Banco não encontrado");
    }
    return bank;
  }

  static async toggleBank(bankId: number, isActive: boolean) {
    const bank = await AdminRepository.toggleBank(bankId, isActive);
    if (!bank) {
      throw new NotFoundError("Banco não encontrado");
    }
    return bank;
  }

  static async deleteBank(bankId: number) {
    const deleted = await AdminRepository.deleteBank(bankId);
    if (!deleted) {
      throw new NotFoundError("Banco não encontrado");
    }
    return true;
  }
}
