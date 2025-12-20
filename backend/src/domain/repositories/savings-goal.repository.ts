import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { savingsGoals, type SavingsGoal, type InsertSavingsGoal } from "../../core/database/schema.js";

export class SavingsGoalRepository {
  static async findById(id: number): Promise<SavingsGoal | null> {
    const result = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByUserId(userId: number): Promise<SavingsGoal[]> {
    return db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
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
}