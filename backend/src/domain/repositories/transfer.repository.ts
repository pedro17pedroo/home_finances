import { eq, sql, and, or, desc } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { transfers, accounts, type Transfer, type InsertTransfer } from "../../core/database/schema.js";

export interface TransferFilters {
  startDate?: Date;
  endDate?: Date;
  accountId?: number;
}

export class TransferRepository {
  static async findById(id: number): Promise<Transfer | null> {
    const result = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByUserId(userId: number, filters?: TransferFilters): Promise<Transfer[]> {
    let query = db
      .select({
        id: transfers.id,
        userId: transfers.userId,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        amount: transfers.amount,
        description: transfers.description,
        createdAt: transfers.createdAt,
        updatedAt: transfers.updatedAt,
        fromAccountName: sql<string>`from_account.name`,
        toAccountName: sql<string>`to_account.name`,
      })
      .from(transfers)
      .leftJoin(
        sql`${accounts} as from_account`,
        eq(transfers.fromAccountId, sql`from_account.id`)
      )
      .leftJoin(
        sql`${accounts} as to_account`,
        eq(transfers.toAccountId, sql`to_account.id`)
      )
      .where(eq(transfers.userId, userId));

    // Apply filters
    if (filters?.startDate) {
      query = query.where(and(
        eq(transfers.userId, userId),
        sql`${transfers.createdAt} >= ${filters.startDate}`
      ));
    }

    if (filters?.endDate) {
      query = query.where(and(
        eq(transfers.userId, userId),
        sql`${transfers.createdAt} <= ${filters.endDate}`
      ));
    }

    if (filters?.accountId) {
      query = query.where(and(
        eq(transfers.userId, userId),
        or(
          eq(transfers.fromAccountId, filters.accountId),
          eq(transfers.toAccountId, filters.accountId)
        )
      ));
    }

    return query.orderBy(desc(transfers.createdAt));
  }

  static async findByAccountId(accountId: number): Promise<Transfer[]> {
    return db
      .select()
      .from(transfers)
      .where(
        or(
          eq(transfers.fromAccountId, accountId),
          eq(transfers.toAccountId, accountId)
        )
      )
      .orderBy(desc(transfers.createdAt));
  }

  static async create(data: InsertTransfer): Promise<Transfer> {
    const result = await db
      .insert(transfers)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(transfers).where(eq(transfers.id, id));
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(eq(transfers.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  static async getTotalAmountByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${transfers.amount})` })
      .from(transfers)
      .where(eq(transfers.userId, userId));
    
    return Number(result[0]?.total || 0);
  }
}