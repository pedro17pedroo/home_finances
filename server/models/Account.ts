import { db } from "../db";
import { accounts, transactions, type Account } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export class AccountModel {
  static async create(userId: number, accountData: {
    name: string;
    bank: string;
    type: 'corrente' | 'poupanca';
    balance?: string;
    interestRate?: string;
  }) {
    const [account] = await db.insert(accounts).values({
      ...accountData,
      userId,
      balance: accountData.balance || '0',
    }).returning();

    return account;
  }

  static async findById(id: number) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  static async findByUserId(userId: number) {
    return await db.select().from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.createdAt);
  }

  static async update(id: number, userId: number, updates: Partial<Account>) {
    const [account] = await db.update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return account;
  }

  static async delete(id: number, userId: number) {
    // Check if account has transactions
    const [transactionCount] = await db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.accountId, id));

    if (Number(transactionCount.count) > 0) {
      throw new Error("Cannot delete account with existing transactions");
    }

    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return true;
  }

  static async updateBalance(accountId: number, newBalance: string) {
    const [account] = await db.update(accounts)
      .set({ balance: newBalance })
      .where(eq(accounts.id, accountId))
      .returning();
    return account;
  }

  static async calculateBalance(accountId: number) {
    const [result] = await db.select({
      totalReceitas: sql<string>`COALESCE(SUM(CASE WHEN type = 'receita' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0)`,
      totalDespesas: sql<string>`COALESCE(SUM(CASE WHEN type = 'despesa' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0)`
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

    const balance = (parseFloat(result.totalReceitas || '0') - parseFloat(result.totalDespesas || '0')).toString();
    
    await this.updateBalance(accountId, balance);
    return balance;
  }

  static async getAccountStats(userId: number) {
    const userAccounts = await this.findByUserId(userId);
    const totalBalance = userAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
    
    return {
      totalAccounts: userAccounts.length,
      totalBalance: totalBalance.toString(),
      accounts: userAccounts
    };
  }
}