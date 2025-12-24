import { eq, sql, and, or, desc, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../core/database/db.js";
import { transfers, accounts, type Transfer, type InsertTransfer } from "../../core/database/schema.js";

export interface TransferFilters {
  startDate?: Date;
  endDate?: Date;
  accountId?: number;
}

export interface TransferWithAccounts extends Transfer {
  fromAccountName?: string;
  fromAccountBank?: string;
  toAccountName?: string;
  toAccountBank?: string;
}

// Aliases for self-join on accounts table
const fromAccount = alias(accounts, 'fromAccount');
const toAccount = alias(accounts, 'toAccount');

export class TransferRepository {
  static async findById(id: number): Promise<Transfer | null> {
    const result = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  static async findByUserId(userId: number, filters?: TransferFilters): Promise<TransferWithAccounts[]> {
    const conditions = [eq(transfers.userId, userId)];

    if (filters?.startDate) {
      conditions.push(gte(transfers.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transfers.createdAt, filters.endDate));
    }
    if (filters?.accountId) {
      conditions.push(
        or(
          eq(transfers.fromAccountId, filters.accountId),
          eq(transfers.toAccountId, filters.accountId)
        )!
      );
    }

    const result = await db
      .select({
        id: transfers.id,
        userId: transfers.userId,
        organizationId: transfers.organizationId,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        amount: transfers.amount,
        description: transfers.description,
        date: transfers.date,
        createdAt: transfers.createdAt,
        updatedAt: transfers.updatedAt,
        fromAccountName: fromAccount.name,
        fromAccountBank: fromAccount.bank,
        toAccountName: toAccount.name,
        toAccountBank: toAccount.bank,
      })
      .from(transfers)
      .leftJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
      .leftJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
      .where(and(...conditions))
      .orderBy(desc(transfers.createdAt));

    return result as TransferWithAccounts[];
  }

  // Find by organization ID (multi-tenant)
  static async findByOrganizationId(organizationId: number, filters?: TransferFilters): Promise<TransferWithAccounts[]> {
    const conditions = [eq(transfers.organizationId, organizationId)];

    if (filters?.startDate) {
      conditions.push(gte(transfers.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transfers.createdAt, filters.endDate));
    }
    if (filters?.accountId) {
      conditions.push(
        or(
          eq(transfers.fromAccountId, filters.accountId),
          eq(transfers.toAccountId, filters.accountId)
        )!
      );
    }

    const result = await db
      .select({
        id: transfers.id,
        userId: transfers.userId,
        organizationId: transfers.organizationId,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        amount: transfers.amount,
        description: transfers.description,
        date: transfers.date,
        createdAt: transfers.createdAt,
        updatedAt: transfers.updatedAt,
        fromAccountName: fromAccount.name,
        fromAccountBank: fromAccount.bank,
        toAccountName: toAccount.name,
        toAccountBank: toAccount.bank,
      })
      .from(transfers)
      .leftJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
      .leftJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
      .where(and(...conditions))
      .orderBy(desc(transfers.createdAt));

    return result as TransferWithAccounts[];
  }

  // Find by organization or user (for migration period)
  static async findByOrganizationOrUser(organizationId: number | null, userId: number, filters?: TransferFilters): Promise<TransferWithAccounts[]> {
    if (organizationId) {
      return this.findByOrganizationId(organizationId, filters);
    }
    return this.findByUserId(userId, filters);
  }

  static async findByAccountId(accountId: number): Promise<TransferWithAccounts[]> {
    const result = await db
      .select({
        id: transfers.id,
        userId: transfers.userId,
        organizationId: transfers.organizationId,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        amount: transfers.amount,
        description: transfers.description,
        date: transfers.date,
        createdAt: transfers.createdAt,
        updatedAt: transfers.updatedAt,
        fromAccountName: fromAccount.name,
        fromAccountBank: fromAccount.bank,
        toAccountName: toAccount.name,
        toAccountBank: toAccount.bank,
      })
      .from(transfers)
      .leftJoin(fromAccount, eq(transfers.fromAccountId, fromAccount.id))
      .leftJoin(toAccount, eq(transfers.toAccountId, toAccount.id))
      .where(
        or(
          eq(transfers.fromAccountId, accountId),
          eq(transfers.toAccountId, accountId)
        )
      )
      .orderBy(desc(transfers.createdAt));

    return result as TransferWithAccounts[];
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

  // Count by organization
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(eq(transfers.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  static async getTotalAmountByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${transfers.amount})` })
      .from(transfers)
      .where(eq(transfers.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  // Get total amount by organization
  static async getTotalAmountByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${transfers.amount})` })
      .from(transfers)
      .where(eq(transfers.organizationId, organizationId));
    
    return Number(result[0]?.total || 0);
  }
}