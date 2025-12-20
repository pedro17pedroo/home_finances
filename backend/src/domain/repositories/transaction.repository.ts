import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { transactions, type Transaction, type InsertTransaction } from "../../core/database/schema.js";
import { logger } from "../../core/utils/logger.js";

export class TransactionRepository {
  static async findById(id: number): Promise<Transaction | null> {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByUserId(
    userId: number,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      type?: 'receita' | 'despesa';
      accountId?: number;
    }
  ): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, userId)];

    if (filters?.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }
    if (filters?.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters?.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }

    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  }

  static async create(data: InsertTransaction): Promise<Transaction> {
    const result = await db
      .insert(transactions)
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
    data: Partial<InsertTransaction>
  ): Promise<Transaction> {
    const result = await db
      .update(transactions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  static async getSummaryByUserId(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    transactionCount: number;
  }> {
    const conditions = [eq(transactions.userId, userId)];

    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }

    const results = await db
      .select({
        type: transactions.type,
        total: sql<number>`sum(${transactions.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.type);

    const summary = {
      totalReceitas: 0,
      totalDespesas: 0,
      saldo: 0,
      transactionCount: 0,
    };

    results.forEach((result) => {
      const total = Number(result.total || 0);
      const count = Number(result.count || 0);
      
      if (result.type === 'receita') {
        summary.totalReceitas = total;
      } else if (result.type === 'despesa') {
        summary.totalDespesas = total;
      }
      
      summary.transactionCount += count;
    });

    summary.saldo = summary.totalReceitas - summary.totalDespesas;

    return summary;
  }

  static async findRecurring(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.isRecurring, true))
      .orderBy(desc(transactions.createdAt));
  }

  static async findRecurringByUserId(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.isRecurring, true)))
      .orderBy(desc(transactions.createdAt));
  }

  static async getLastRecurringExecution(transactionId: number): Promise<string | null> {
    const [lastExecution] = await db
      .select({ date: transactions.createdAt })
      .from(transactions)
      .where(eq(transactions.recurringParentId, transactionId))
      .orderBy(desc(transactions.createdAt))
      .limit(1);
    
    return lastExecution?.date?.toISOString() || null;
  }

  static async recordRecurringExecution(transactionId: number, executionDate: Date): Promise<void> {
    // A informação está implícita nas transações criadas com recurringParentId
    // Não precisamos de ação adicional aqui
  }
}
