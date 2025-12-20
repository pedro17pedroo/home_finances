import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  adminUsers, 
  users, 
  plans, 
  auditLogs,
  systemSettings,
  landingContent,
  legalContent,
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
  static async getAllUsers(limit: number = 100, offset: number = 0) {
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
        createdAt: users.createdAt,
        planName: plans.name,
        planPrice: plans.price
      })
      .from(users)
      .leftJoin(plans, eq(users.planType, plans.name))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return {
      users: usersData,
      total: Number(totalUsers[0]?.count || 0)
    };
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
}