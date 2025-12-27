import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { savingsGoals, accounts, type SavingsGoal, type InsertSavingsGoal } from "../../core/database/schema.js";

// Extended type with account info
export interface SavingsGoalWithAccount extends SavingsGoal {
  accountName?: string | null;
  accountBalance?: string | null;
  accountBank?: string | null;
}

export class SavingsGoalRepository {
  static async findById(id: number): Promise<SavingsGoalWithAccount | null> {
    const result = await db
      .select({
        id: savingsGoals.id,
        userId: savingsGoals.userId,
        organizationId: savingsGoals.organizationId,
        accountId: savingsGoals.accountId,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
        targetDate: savingsGoals.targetDate,
        description: savingsGoals.description,
        isActive: savingsGoals.isActive,
        createdAt: savingsGoals.createdAt,
        updatedAt: savingsGoals.updatedAt,
        accountName: accounts.name,
        accountBalance: accounts.balance,
        accountBank: accounts.bank,
      })
      .from(savingsGoals)
      .leftJoin(accounts, eq(savingsGoals.accountId, accounts.id))
      .where(eq(savingsGoals.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByUserId(userId: number): Promise<SavingsGoalWithAccount[]> {
    return db
      .select({
        id: savingsGoals.id,
        userId: savingsGoals.userId,
        organizationId: savingsGoals.organizationId,
        accountId: savingsGoals.accountId,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
        targetDate: savingsGoals.targetDate,
        description: savingsGoals.description,
        isActive: savingsGoals.isActive,
        createdAt: savingsGoals.createdAt,
        updatedAt: savingsGoals.updatedAt,
        accountName: accounts.name,
        accountBalance: accounts.balance,
        accountBank: accounts.bank,
      })
      .from(savingsGoals)
      .leftJoin(accounts, eq(savingsGoals.accountId, accounts.id))
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  // Find by organization
  static async findByOrganizationId(organizationId: number): Promise<SavingsGoalWithAccount[]> {
    return db
      .select({
        id: savingsGoals.id,
        userId: savingsGoals.userId,
        organizationId: savingsGoals.organizationId,
        accountId: savingsGoals.accountId,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
        targetDate: savingsGoals.targetDate,
        description: savingsGoals.description,
        isActive: savingsGoals.isActive,
        createdAt: savingsGoals.createdAt,
        updatedAt: savingsGoals.updatedAt,
        accountName: accounts.name,
        accountBalance: accounts.balance,
        accountBank: accounts.bank,
      })
      .from(savingsGoals)
      .leftJoin(accounts, eq(savingsGoals.accountId, accounts.id))
      .where(eq(savingsGoals.organizationId, organizationId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  // Find by organization or user
  static async findByOrganizationOrUser(organizationId: number | null, userId: number): Promise<SavingsGoalWithAccount[]> {
    if (organizationId) {
      return this.findByOrganizationId(organizationId);
    }
    return this.findByUserId(userId);
  }

  static async create(data: InsertSavingsGoal): Promise<SavingsGoal> {
    const result = await db
      .insert(savingsGoals)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  static async update(
    id: number,
    data: Partial<InsertSavingsGoal>
  ): Promise<SavingsGoal> {
    const result = await db
      .update(savingsGoals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(savingsGoals.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(savingsGoals)
      .where(eq(savingsGoals.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  static async getTotalTargetByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${savingsGoals.targetAmount})` })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  static async getTotalCurrentByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${savingsGoals.currentAmount})` })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  // Get totals by organization
  static async getTotalTargetByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${savingsGoals.targetAmount})` })
      .from(savingsGoals)
      .where(eq(savingsGoals.organizationId, organizationId));
    
    return Number(result[0]?.total || 0);
  }

  static async getTotalCurrentByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${savingsGoals.currentAmount})` })
      .from(savingsGoals)
      .where(eq(savingsGoals.organizationId, organizationId));
    
    return Number(result[0]?.total || 0);
  }
}