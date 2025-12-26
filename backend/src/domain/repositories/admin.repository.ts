import { eq, desc, and, sql, like, or, asc, gt } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  adminUsers, 
  users, 
  plans, 
  auditLogs,
  systemSettings,
  landingContent,
  legalContent,
  faqItems,
  contactMessages,
  subscriptionPayments,
  securityLogs,
  blockedIPs,
  paymentMethods,
  adminPasswordResetTokens,
  type AdminUser, 
  type InsertAdminUser,
  type Plan,
  type InsertPlan,
  type LandingContent,
  type InsertLandingContent,
  type LegalContent,
  type InsertLegalContent,
  type FaqItem,
  type InsertFaqItem,
  type ContactMessage,
  type InsertContactMessage
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

  static async findAdminById(id: number): Promise<AdminUser | null> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id));
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
    try {
      const usersData = await db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          planType: users.planType,
          subscriptionStatus: users.subscriptionStatus,
          trialEndsAt: users.trialEndsAt,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return usersData;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
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

  // Dashboard Stats - Real data from database
  static async getDashboardStats() {
    try {
      // Total users
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const totalUsers = Number(totalUsersResult[0]?.count || 0);

      // Active users (with active subscription)
      const activeUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));
      const activeUsers = Number(activeUsersResult[0]?.count || 0);

      // New users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} >= ${startOfMonth}`);
      const newUsersThisMonth = Number(newUsersResult[0]?.count || 0);

      // Subscription stats
      const subscriptionStats = await db
        .select({
          status: users.subscriptionStatus,
          count: sql<number>`count(*)`
        })
        .from(users)
        .groupBy(users.subscriptionStatus);

      const subscriptions = {
        active: 0,
        trial: 0,
        cancelled: 0
      };
      
      subscriptionStats.forEach(stat => {
        if (stat.status === 'active') subscriptions.active = Number(stat.count);
        if (stat.status === 'trialing') subscriptions.trial = Number(stat.count);
        if (stat.status === 'canceled') subscriptions.cancelled = Number(stat.count);
      });

      // Payment stats
      const paymentStats = await db
        .select({
          status: subscriptionPayments.status,
          count: sql<number>`count(*)`,
          total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
        })
        .from(subscriptionPayments)
        .groupBy(subscriptionPayments.status);

      const payments = {
        pending: 0,
        completed: 0,
        failed: 0
      };
      
      let totalRevenue = 0;
      
      paymentStats.forEach(stat => {
        if (stat.status === 'pending') payments.pending = Number(stat.count);
        if (stat.status === 'paid') {
          payments.completed = Number(stat.count);
          totalRevenue = Number(stat.total);
        }
        if (stat.status === 'failed') payments.failed = Number(stat.count);
      });

      // Monthly revenue (current month)
      const monthlyRevenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
        })
        .from(subscriptionPayments)
        .where(and(
          eq(subscriptionPayments.status, 'paid'),
          sql`${subscriptionPayments.paidAt} >= ${startOfMonth}`
        ));
      const monthlyRevenue = Number(monthlyRevenueResult[0]?.total || 0);

      // Calculate growth (compare with last month)
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      
      const lastMonthRevenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
        })
        .from(subscriptionPayments)
        .where(and(
          eq(subscriptionPayments.status, 'paid'),
          sql`${subscriptionPayments.paidAt} >= ${startOfLastMonth}`,
          sql`${subscriptionPayments.paidAt} < ${startOfMonth}`
        ));
      const lastMonthRevenue = Number(lastMonthRevenueResult[0]?.total || 0);
      
      const growth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Get monthly revenue for last 6 months (for chart)
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const revenueHistory: { month: string; revenue: number }[] = [];
      const userGrowthHistory: { month: string; users: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        const monthName = monthNames[monthStart.getMonth()];
        
        // Revenue for this month
        const revenueResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
          })
          .from(subscriptionPayments)
          .where(and(
            eq(subscriptionPayments.status, 'paid'),
            sql`${subscriptionPayments.paidAt} >= ${monthStart}`,
            sql`${subscriptionPayments.paidAt} < ${monthEnd}`
          ));
        
        revenueHistory.push({
          month: monthName,
          revenue: Number(revenueResult[0]?.total || 0)
        });
        
        // Users count at end of this month
        const usersResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.createdAt} < ${monthEnd}`);
        
        userGrowthHistory.push({
          month: monthName,
          users: Number(usersResult[0]?.count || 0)
        });
      }

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth
        },
        revenue: {
          monthly: monthlyRevenue,
          total: totalRevenue,
          growth: Math.round(growth * 10) / 10
        },
        subscriptions,
        payments,
        charts: {
          revenueHistory,
          userGrowthHistory
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return default values on error
      return {
        users: { total: 0, active: 0, newThisMonth: 0 },
        revenue: { monthly: 0, total: 0, growth: 0 },
        subscriptions: { active: 0, trial: 0, cancelled: 0 },
        payments: { pending: 0, completed: 0, failed: 0 },
        charts: {
          revenueHistory: [],
          userGrowthHistory: []
        }
      };
    }
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
    const defaultSettings = {
      general: { siteName: 'FinançasPro', siteUrl: 'https://financaspro.ao', supportEmail: 'suporte@financaspro.ao', currency: 'AOA' },
      email: { smtpHost: '', smtpPort: 587, smtpUser: '', fromEmail: '', fromName: '' },
      payment: { tpagamentoApiKey: '', tpagamentoUrl: 'https://tpagamento-backend.tatusolutions.com', enableEkwanza: true, enableGpo: true, enableRef: true },
      notifications: { enableEmailNotifications: true, enablePushNotifications: false, adminAlertEmail: '' },
    };
    
    try {
      const settings = await db.select().from(systemSettings);
      
      // If no settings in database, return defaults
      if (!settings || settings.length === 0) {
        return defaultSettings;
      }
      
      // Build result from database values
      const result: Record<string, any> = { ...defaultSettings };
      settings.forEach(s => {
        try {
          result[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        } catch {
          result[s.key] = s.value;
        }
      });
      return result;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return defaultSettings;
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

  // Reports - Real data from database
  static async getReports(period: string) {
    try {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      // Revenue by month (last 6 months)
      const revenue: { month: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        const revenueResult = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
          })
          .from(subscriptionPayments)
          .where(and(
            eq(subscriptionPayments.status, 'paid'),
            sql`${subscriptionPayments.paidAt} >= ${monthStart}`,
            sql`${subscriptionPayments.paidAt} < ${monthEnd}`
          ));
        
        revenue.push({
          month: monthNames[monthStart.getMonth()],
          value: Number(revenueResult[0]?.total || 0)
        });
      }

      // Plan distribution
      const planStats = await db
        .select({
          planType: users.planType,
          count: sql<number>`count(*)`
        })
        .from(users)
        .groupBy(users.planType);

      const planDistribution = planStats.map(stat => ({
        name: stat.planType === 'basic' ? 'Básico' : 
              stat.planType === 'premium' ? 'Premium' : 
              stat.planType === 'enterprise' ? 'Enterprise' : 'Gratuito',
        value: Number(stat.count)
      }));

      // Payment methods distribution
      const paymentMethodStats = await db
        .select({
          method: subscriptionPayments.paymentMethod,
          count: sql<number>`count(*)`
        })
        .from(subscriptionPayments)
        .groupBy(subscriptionPayments.paymentMethod);

      const paymentMethods = paymentMethodStats.map(stat => ({
        method: stat.method === 'ekwanza' ? 'E-Kwanza' :
                stat.method === 'gpo' ? 'Multicaixa Express' :
                stat.method === 'ref' ? 'Referência' : stat.method,
        count: Number(stat.count)
      }));

      // Summary stats
      const totalRevenueResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${subscriptionPayments.amount} AS DECIMAL)), 0)`
        })
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.status, 'paid'));

      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      const activeSubscriptionsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));

      const totalUsers = Number(totalUsersResult[0]?.count || 0);
      const activeSubscriptions = Number(activeSubscriptionsResult[0]?.count || 0);
      const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;

      return {
        revenue,
        planDistribution,
        paymentMethods,
        summary: {
          totalRevenue: Number(totalRevenueResult[0]?.total || 0),
          totalUsers,
          activeSubscriptions,
          conversionRate: Math.round(conversionRate * 10) / 10
        }
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return {
        revenue: [],
        planDistribution: [],
        paymentMethods: [],
        summary: { totalRevenue: 0, totalUsers: 0, activeSubscriptions: 0, conversionRate: 0 }
      };
    }
  }

  // FAQ Management
  static async getAllFaqItems(): Promise<FaqItem[]> {
    try {
      return await db
        .select()
        .from(faqItems)
        .where(eq(faqItems.isActive, true))
        .orderBy(faqItems.category, faqItems.order);
    } catch {
      return [];
    }
  }

  static async getFaqByCategory(category: string): Promise<FaqItem[]> {
    try {
      return await db
        .select()
        .from(faqItems)
        .where(and(eq(faqItems.category, category), eq(faqItems.isActive, true)))
        .orderBy(faqItems.order);
    } catch {
      return [];
    }
  }

  static async createFaqItem(data: InsertFaqItem): Promise<FaqItem> {
    const [item] = await db.insert(faqItems).values(data).returning();
    return item;
  }

  static async updateFaqItem(id: number, data: Partial<InsertFaqItem>): Promise<FaqItem | null> {
    const [item] = await db
      .update(faqItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(faqItems.id, id))
      .returning();
    return item || null;
  }

  static async deleteFaqItem(id: number): Promise<boolean> {
    const result = await db.delete(faqItems).where(eq(faqItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Contact Messages Management
  static async getAllContactMessages(status?: string): Promise<ContactMessage[]> {
    try {
      if (status && status !== 'all') {
        return await db
          .select()
          .from(contactMessages)
          .where(eq(contactMessages.status, status))
          .orderBy(desc(contactMessages.createdAt));
      }
      return await db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.createdAt));
    } catch {
      return [];
    }
  }

  static async createContactMessage(data: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db.insert(contactMessages).values(data).returning();
    return message;
  }

  static async updateContactMessageStatus(id: number, status: string, adminId?: number, notes?: string): Promise<ContactMessage | null> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'replied' && adminId) {
      updateData.repliedAt = new Date();
      updateData.repliedBy = adminId;
    }
    if (notes) {
      updateData.adminNotes = notes;
    }
    const [message] = await db
      .update(contactMessages)
      .set(updateData)
      .where(eq(contactMessages.id, id))
      .returning();
    return message || null;
  }

  static async deleteContactMessage(id: number): Promise<boolean> {
    const result = await db.delete(contactMessages).where(eq(contactMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Payment Methods
  static async getPaymentMethods() {
    return await db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.displayOrder));
  }

  static async updatePaymentMethod(id: number, data: any) {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Only update fields that are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.processingTime !== undefined) updateData.processingTime = data.processingTime;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.waitTimeSeconds !== undefined) updateData.waitTimeSeconds = data.waitTimeSeconds;
    if (data.maxWaitTimeSeconds !== undefined) updateData.maxWaitTimeSeconds = data.maxWaitTimeSeconds;
    if (data.isInstant !== undefined) updateData.isInstant = data.isInstant;
    if (data.requiresPhone !== undefined) updateData.requiresPhone = data.requiresPhone;
    if (data.requiresEmail !== undefined) updateData.requiresEmail = data.requiresEmail;
    if (data.requiresReference !== undefined) updateData.requiresReference = data.requiresReference;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [method] = await db
      .update(paymentMethods)
      .set(updateData)
      .where(eq(paymentMethods.id, id))
      .returning();
    
    return method || null;
  }

  static async togglePaymentMethod(id: number, isActive: boolean) {
    const [method] = await db
      .update(paymentMethods)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    
    return method || null;
  }

  // Banks Management
  static async getBanks() {
    const { banks } = await import("../../core/database/schema.js");
    return await db
      .select()
      .from(banks)
      .orderBy(asc(banks.displayOrder), asc(banks.name));
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
    const { banks } = await import("../../core/database/schema.js");
    const [bank] = await db
      .insert(banks)
      .values({
        code: data.code,
        name: data.name,
        shortName: data.shortName || null,
        logoUrl: data.logoUrl || null,
        swiftCode: data.swiftCode || null,
        country: data.country || 'AO',
        displayOrder: data.displayOrder || 0,
        isActive: true,
      })
      .returning();
    return bank;
  }

  static async updateBank(id: number, data: {
    code?: string;
    name?: string;
    shortName?: string;
    logoUrl?: string;
    swiftCode?: string;
    country?: string;
    displayOrder?: number;
  }) {
    const { banks } = await import("../../core/database/schema.js");
    const [bank] = await db
      .update(banks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(banks.id, id))
      .returning();
    return bank || null;
  }

  static async toggleBank(id: number, isActive: boolean) {
    const { banks } = await import("../../core/database/schema.js");
    const [bank] = await db
      .update(banks)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(banks.id, id))
      .returning();
    return bank || null;
  }

  static async deleteBank(id: number) {
    const { banks } = await import("../../core/database/schema.js");
    const result = await db.delete(banks).where(eq(banks.id, id));
    return result.rowCount > 0;
  }

  // Password Reset Token Management
  static async savePasswordResetToken(adminId: number, token: string, expiresAt: Date) {
    // Delete any existing tokens for this admin
    await db
      .delete(adminPasswordResetTokens)
      .where(eq(adminPasswordResetTokens.adminUserId, adminId));
    
    // Create new token
    await db.insert(adminPasswordResetTokens).values({
      adminUserId: adminId,
      token,
      expiresAt
    });
  }

  static async findAdminByResetToken(token: string): Promise<AdminUser | null> {
    const [tokenRecord] = await db
      .select()
      .from(adminPasswordResetTokens)
      .where(and(
        eq(adminPasswordResetTokens.token, token),
        gt(adminPasswordResetTokens.expiresAt, new Date()),
        sql`${adminPasswordResetTokens.usedAt} IS NULL`
      ));
    
    if (!tokenRecord) {
      return null;
    }

    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, tokenRecord.adminUserId));
    
    return admin || null;
  }

  static async updateAdminPassword(adminId: number, passwordHash: string) {
    // Update password
    await db
      .update(adminUsers)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, adminId));
    
    // Mark all tokens as used
    await db
      .update(adminPasswordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(adminPasswordResetTokens.adminUserId, adminId));
  }
}
