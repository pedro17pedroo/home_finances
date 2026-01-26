import { eq, sql, and, or, isNull } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { accounts, banks, type Account, type InsertAccount } from "../../core/database/schema.js";

// Extended Account type with bank information
export interface AccountWithBank extends Account {
  bankName?: string | null;
  bankCode?: string | null;
  bankLogoUrl?: string | null;
}

export class AccountRepository {
  static async findById(id: number): Promise<AccountWithBank | null> {
    const result = await db
      .select({
        // Account fields
        id: accounts.id,
        userId: accounts.userId,
        organizationId: accounts.organizationId,
        name: accounts.name,
        type: accounts.type,
        bank: accounts.bank,
        bankId: accounts.bankId,
        balance: accounts.balance,
        color: accounts.color,
        interestRate: accounts.interestRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        // Bank fields
        bankName: banks.name,
        bankCode: banks.code,
        bankLogoUrl: banks.logoUrl,
      })
      .from(accounts)
      .leftJoin(banks, eq(accounts.bankId, banks.id))
      .where(eq(accounts.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  // Find by user ID (backward compatibility)
  static async findByUserId(userId: number): Promise<AccountWithBank[]> {
    return db
      .select({
        // Account fields
        id: accounts.id,
        userId: accounts.userId,
        organizationId: accounts.organizationId,
        name: accounts.name,
        type: accounts.type,
        bank: accounts.bank,
        bankId: accounts.bankId,
        balance: accounts.balance,
        color: accounts.color,
        interestRate: accounts.interestRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        // Bank fields
        bankName: banks.name,
        bankCode: banks.code,
        bankLogoUrl: banks.logoUrl,
      })
      .from(accounts)
      .leftJoin(banks, eq(accounts.bankId, banks.id))
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.name);
  }

  // Find by organization ID (multi-tenant)
  static async findByOrganizationId(organizationId: number): Promise<AccountWithBank[]> {
    return db
      .select({
        // Account fields
        id: accounts.id,
        userId: accounts.userId,
        organizationId: accounts.organizationId,
        name: accounts.name,
        type: accounts.type,
        bank: accounts.bank,
        bankId: accounts.bankId,
        balance: accounts.balance,
        color: accounts.color,
        interestRate: accounts.interestRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        // Bank fields
        bankName: banks.name,
        bankCode: banks.code,
        bankLogoUrl: banks.logoUrl,
      })
      .from(accounts)
      .leftJoin(banks, eq(accounts.bankId, banks.id))
      .where(eq(accounts.organizationId, organizationId))
      .orderBy(accounts.name);
  }

  // Find by organization or user (for migration period)
  static async findByOrganizationOrUser(organizationId: number | null, userId: number): Promise<AccountWithBank[]> {
    if (organizationId) {
      return this.findByOrganizationId(organizationId);
    }
    return this.findByUserId(userId);
  }

  static async findByUserIdAndType(userId: number, type: 'corrente' | 'poupanca'): Promise<AccountWithBank[]> {
    return db
      .select({
        // Account fields
        id: accounts.id,
        userId: accounts.userId,
        organizationId: accounts.organizationId,
        name: accounts.name,
        type: accounts.type,
        bank: accounts.bank,
        bankId: accounts.bankId,
        balance: accounts.balance,
        color: accounts.color,
        interestRate: accounts.interestRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        // Bank fields
        bankName: banks.name,
        bankCode: banks.code,
        bankLogoUrl: banks.logoUrl,
      })
      .from(accounts)
      .leftJoin(banks, eq(accounts.bankId, banks.id))
      .where(and(eq(accounts.userId, userId), eq(accounts.type, type)))
      .orderBy(accounts.name);
  }

  // Find by organization and type
  static async findByOrganizationIdAndType(organizationId: number, type: 'corrente' | 'poupanca'): Promise<AccountWithBank[]> {
    return db
      .select({
        // Account fields
        id: accounts.id,
        userId: accounts.userId,
        organizationId: accounts.organizationId,
        name: accounts.name,
        type: accounts.type,
        bank: accounts.bank,
        bankId: accounts.bankId,
        balance: accounts.balance,
        color: accounts.color,
        interestRate: accounts.interestRate,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
        // Bank fields
        bankName: banks.name,
        bankCode: banks.code,
        bankLogoUrl: banks.logoUrl,
      })
      .from(accounts)
      .leftJoin(banks, eq(accounts.bankId, banks.id))
      .where(and(eq(accounts.organizationId, organizationId), eq(accounts.type, type)))
      .orderBy(accounts.name);
  }

  static async create(data: InsertAccount): Promise<Account> {
    const result = await db
      .insert(accounts)
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
    data: Partial<InsertAccount>
  ): Promise<Account> {
    const result = await db
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();
    
    return result[0];
  }

  static async updateBalance(id: number, balance: number): Promise<Account> {
    const result = await db
      .update(accounts)
      .set({
        balance: balance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();
    
    return result[0];
  }

  static async delete(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization
  static async countByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId));
    
    return Number(result[0]?.count || 0);
  }

  // Count by organization or user (for migration period)
  static async countByOrganizationOrUser(organizationId: number | null, userId: number): Promise<number> {
    if (organizationId) {
      return this.countByOrganizationId(organizationId);
    }
    return this.countByUserId(userId);
  }

  static async getTotalBalanceByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${accounts.balance})` })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  // Get total balance by organization
  static async getTotalBalanceByOrganizationId(organizationId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${accounts.balance})` })
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId));
    
    return Number(result[0]?.total || 0);
  }
}