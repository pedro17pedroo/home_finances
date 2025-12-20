import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  adminUsers, 
  users, 
  plans, 
  auditLogs,
  systemSettings,
  landingContent,
  legalContent,
  subscriptionPayments,
  securityLogs,
  blockedIPs,
  type AdminUser, 
  type InsertAdminUser,
  type Plan,
  type InsertPlan,
  type LandingContent,
  type InsertLandingContent,
  type LegalContent,
  type InsertLegalContent
} from "../../core/database/schema.js";

export class AdminRepository {
  // Admin Users
  static async findAdminByEmail(email: string): Promise<AdminUser | null> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));
    return admin || null;
  }

  static async createAdmin(data: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsers).values(data).returning();
    return admin;
  }

  static async getAllAdmins(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }

  // Plans Management
  static async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.id);
  }

  static async createPlan(data: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(data).returning();
    return plan;
  }

  static async updatePlan(id: number, data: Partial<InsertPlan>): Promise<Plan | null> {
    const [plan] = await db
      .update(plans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plans.id, id))
      .returning();
    return plan || null;
  }

  static async deletePlan(id: number): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return result.rowCount > 0;
  }

  // Users Management
  static async getAllUsers(limit: number = 100, offset: number = 0, search?: string, status?: string) {
    let query = db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        planType: users.planType,
        subscriptionStatus: users.subscriptionStatus,
        trialEndsAt: users.trialEndsAt,
        createdAt: users.createdAt,
        planName: plans.name,
        planPrice: plans.price
      })
      .from(users)
      .leftJoin(plans, eq(users.planType, plans.name))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const usersData = await query;

    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return usersData;
  }

  static async getUserStats() {
    const stats = await db
      .select({
        planType: users.planType,
        subscriptionStatus: users.subscriptionStatus,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.planType, users.subscriptionStatus);

    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const activeUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.subscriptionStatus, 'active'));

    return {
      total: Number(totalUsers[0]?.count || 0),
      active: Number(activeUsers[0]?.count || 0),
      byPlan: stats.map(stat => ({
        planType: stat.planType,
        subscriptionStatus: stat.subscriptionStatus,
        count: Number(stat.count)
      }))
    };
  }

  // Landing Content Management
  static async getLandingContent(): Promise<LandingContent[]> {
    return await db.select().from(landingContent).orderBy(landingContent.section);
  }

  static async updateLandingContent(section: string, data: Partial<InsertLandingContent>): Promise<LandingContent | null> {
    const [content] = await db
      .update(landingContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(landingContent.section, section))
      .returning();
    
    if (!content) {
      // Create if doesn't exist
      const [newContent] = await db
        .insert(landingContent)
        .values({ section, ...data } as InsertLandingContent)
        .returning();
      return newContent;
    }
    
    return content;
  }

  // Legal Content Management
  static async getLegalContent(): Promise<LegalContent[]> {
    return await db.select().from(legalContent).orderBy(legalContent.type);
  }

  static async updateLegalContent(type: string, data: Partial<InsertLegalContent>): Promise<LegalContent | null> {
    const [content] = await db
      .update(legalContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(legalContent.type, type))
      .returning();
    
    if (!content) {
      // Create if doesn't exist
      const [newContent] = await db
        .insert(legalContent)
        .values({ type, ...data } as InsertLegalContent)
        .returning();
      return newContent;
    }
    
    return content;
  }

  // Audit Logs
  static async createAuditLog(adminUserId: number, action: string, entityType?: string, entityId?: number, details?: any) {
    await db.insert(auditLogs).values({
      adminUserId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null
    });
  }

  static async getAuditLogs(limit: number = 100, offset: number = 0) {
    return await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        adminEmail: adminUsers.email
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // User Status Management
  static async updateUserStatus(userId: number, isActive: boolean) {
    await db
      .update(users)
      .set({ 
        subscriptionStatus: isActive ? 'active' : 'canceled',
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Payments Management
  static async getPayments(status?: string) {
    try {
      const payments = await db
        .select({
          id: subscriptionPayments.id,
          userId: subscriptionPayments.userId,
          amount: subscriptionPayments.amount,
          paymentMethod: subscriptionPayments.paymentMethod,
          status: subscriptionPayments.status,
          referenceCode: subscriptionPayments.referenceCode,
          createdAt: subscriptionPayments.createdAt,
          paidAt: subscriptionPayments.paidAt,
          userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`
        })
        .from(subscriptionPayments)
        .leftJoin(users, eq(subscriptionPayments.userId, users.id))
        .orderBy(desc(subscriptionPayments.createdAt));
      
      if (status && status !== 'all') {
        return payments.filter(p => p.status === status);
      }
      return payments;
    } catch {
      return [];
    }
  }

  static async updatePaymentStatus(paymentId: number, status: string) {
    await db
      .update(subscriptionPayments)
      .set({ 
        status,
        paidAt: status === 'paid' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(subscriptionPayments.id, paymentId));
  }

  // Security Events Management
  static async getSecurityEvents() {
    try {
      return await db
        .select()
        .from(securityLogs)
        .orderBy(desc(securityLogs.createdAt))
        .limit(100);
    } catch {
      return [];
    }
  }

  static async resolveSecurityEvent(eventId: number, adminId: number) {
    await db
      .update(securityLogs)
      .set({ 
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminId
      })
      .where(eq(securityLogs.id, eventId));
  }

  // Blocked IPs Management
  static async getBlockedIPs() {
    try {
      return await db
        .select()
        .from(blockedIPs)
        .where(eq(blockedIPs.isActive, true))
        .orderBy(desc(blockedIPs.createdAt));
    } catch {
      return [];
    }
  }

  static async blockIP(data: { ipAddress: string; reason: string; expiresAt?: string }, adminId: number) {
    await db.insert(blockedIPs).values({
      ipAddress: data.ipAddress,
      reason: data.reason,
      blockedBy: adminId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: true
    });
  }

  static async unblockIP(ipId: number) {
    await db
      .update(blockedIPs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(blockedIPs.id, ipId));
  }

  // Admin Notifications Management
  static async getAdminNotifications() {
    // Return mock data for now - can be implemented with a notifications table
    return [];
  }

  static async createNotification(data: { title: string; message: string; type: string; targetType: string }) {
    // TODO: Implement notification creation
    return data;
  }

  static async deleteNotification(notificationId: number) {
    // TODO: Implement notification deletion
    return true;
  }

  // Settings Management
  static async getSettings() {
    try {
      const settings = await db.select().from(systemSettings);
      const result: Record<string, any> = {};
      settings.forEach(s => {
        result[s.key] = s.value;
      });
      return result;
    } catch {
      return {
        general: { siteName: 'FinançasPro', siteUrl: 'https://financaspro.ao', supportEmail: 'suporte@financaspro.ao', currency: 'AOA' },
        email: { smtpHost: '', smtpPort: 587, smtpUser: '', fromEmail: '', fromName: '' },
        payment: { tpagamentoApiKey: '', tpagamentoUrl: 'https://tpagamento-backend.tatusolutions.com', enableEkwanza: true, enableGpo: true, enableRef: true },
        notifications: { enableEmailNotifications: true, enablePushNotifications: false, adminAlertEmail: '' },
      };
    }
  }

  static async updateSettings(data: any) {
    for (const [key, value] of Object.entries(data)) {
      await db
        .insert(systemSettings)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: JSON.stringify(value), updatedAt: new Date() }
        });
    }
  }

  // Content Management
  static async getContentByType(type: string) {
    try {
      if (type === 'landing') {
        return await db.select().from(landingContent);
      }
      return await db.select().from(legalContent).where(eq(legalContent.type, type));
    } catch {
      return [{ id: 1, type, title: 'Conteúdo Principal', content: 'Lorem ipsum...', version: '1.0', isActive: true, updatedAt: new Date().toISOString() }];
    }
  }

  static async updateContentById(contentId: number, data: { content: string }) {
    await db
      .update(legalContent)
      .set({ content: data.content, updatedAt: new Date() })
      .where(eq(legalContent.id, contentId));
  }
}