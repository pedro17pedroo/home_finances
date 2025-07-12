import { 
  accounts, 
  transactions, 
  savingsGoals, 
  loans, 
  debts, 
  categories,
  type Account, 
  type InsertAccount,
  type Transaction, 
  type InsertTransaction,
  type SavingsGoal,
  type InsertSavingsGoal,
  type Loan,
  type InsertLoan,
  type Debt,
  type InsertDebt,
  type Category,
  type InsertCategory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;

  // Transactions
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByCategory(category: string): Promise<Transaction[]>;

  // Savings Goals
  getSavingsGoals(): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, goal: Partial<InsertSavingsGoal>): Promise<SavingsGoal>;
  deleteSavingsGoal(id: number): Promise<void>;

  // Loans
  getLoans(): Promise<Loan[]>;
  getLoan(id: number): Promise<Loan | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan>;
  deleteLoan(id: number): Promise<void>;

  // Debts
  getDebts(): Promise<Debt[]>;
  getDebt(id: number): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Dashboard data
  getFinancialSummary(): Promise<{
    currentAccountBalance: string;
    totalSavings: string;
    totalDebts: string;
    totalLoans: string;
  }>;
  getMonthlyTransactionsSummary(): Promise<{
    income: string;
    expenses: string;
    month: string;
  }[]>;
  getExpensesByCategory(): Promise<{
    category: string;
    amount: string;
    percentage: number;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // Accounts
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: number, insertAccount: Partial<InsertAccount>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...insertAccount, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Transactions
  async getTransactions(limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    
    // Update account balance if accountId is provided
    if (insertTransaction.accountId) {
      const amount = parseFloat(insertTransaction.amount);
      const adjustment = insertTransaction.type === 'receita' ? amount : -amount;
      
      await db
        .update(accounts)
        .set({
          balance: sql`balance + ${adjustment}`,
          updatedAt: new Date()
        })
        .where(eq(accounts.id, insertTransaction.accountId));
    }
    
    return transaction;
  }

  async updateTransaction(id: number, insertTransaction: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({ ...insertTransaction, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(sql`${transactions.category} = ${category}`)
      .orderBy(desc(transactions.date));
  }

  // Savings Goals
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    return await db.select().from(savingsGoals).where(eq(savingsGoals.isActive, true));
  }

  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    const [goal] = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
    return goal || undefined;
  }

  async createSavingsGoal(insertGoal: InsertSavingsGoal): Promise<SavingsGoal> {
    const [goal] = await db.insert(savingsGoals).values(insertGoal).returning();
    return goal;
  }

  async updateSavingsGoal(id: number, insertGoal: Partial<InsertSavingsGoal>): Promise<SavingsGoal> {
    const [goal] = await db
      .update(savingsGoals)
      .set({ ...insertGoal, updatedAt: new Date() })
      .where(eq(savingsGoals.id, id))
      .returning();
    return goal;
  }

  async deleteSavingsGoal(id: number): Promise<void> {
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  }

  // Loans
  async getLoans(): Promise<Loan[]> {
    return await db.select().from(loans);
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, id));
    return loan || undefined;
  }

  async createLoan(insertLoan: InsertLoan): Promise<Loan> {
    const [loan] = await db.insert(loans).values(insertLoan).returning();
    return loan;
  }

  async updateLoan(id: number, insertLoan: Partial<InsertLoan>): Promise<Loan> {
    const [loan] = await db
      .update(loans)
      .set({ ...insertLoan, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return loan;
  }

  async deleteLoan(id: number): Promise<void> {
    await db.delete(loans).where(eq(loans.id, id));
  }

  // Debts
  async getDebts(): Promise<Debt[]> {
    return await db.select().from(debts);
  }

  async getDebt(id: number): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt || undefined;
  }

  async createDebt(insertDebt: InsertDebt): Promise<Debt> {
    const [debt] = await db.insert(debts).values(insertDebt).returning();
    return debt;
  }

  async updateDebt(id: number, insertDebt: Partial<InsertDebt>): Promise<Debt> {
    const [debt] = await db
      .update(debts)
      .set({ ...insertDebt, updatedAt: new Date() })
      .where(eq(debts.id, id))
      .returning();
    return debt;
  }

  async deleteDebt(id: number): Promise<void> {
    await db.delete(debts).where(eq(debts.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Dashboard data
  async getFinancialSummary(): Promise<{
    currentAccountBalance: string;
    totalSavings: string;
    totalDebts: string;
    totalLoans: string;
  }> {
    const [currentAccounts] = await db
      .select({ total: sql<string>`COALESCE(SUM(balance), 0)` })
      .from(accounts)
      .where(eq(accounts.type, 'corrente'));

    const [savingsAccounts] = await db
      .select({ total: sql<string>`COALESCE(SUM(balance), 0)` })
      .from(accounts)
      .where(eq(accounts.type, 'poupanca'));

    const [totalDebts] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(debts)
      .where(eq(debts.status, 'pendente'));

    const [totalLoans] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(loans)
      .where(eq(loans.status, 'pendente'));

    return {
      currentAccountBalance: currentAccounts?.total || '0',
      totalSavings: savingsAccounts?.total || '0',
      totalDebts: totalDebts?.total || '0',
      totalLoans: totalLoans?.total || '0',
    };
  }

  async getMonthlyTransactionsSummary(): Promise<{
    income: string;
    expenses: string;
    month: string;
  }[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const results = await db
      .select({
        month: sql<string>`TO_CHAR(date, 'YYYY-MM')`,
        income: sql<string>`COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0)`,
        expenses: sql<string>`COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(gte(transactions.date, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(date, 'YYYY-MM')`);

    return results;
  }

  async getExpensesByCategory(): Promise<{
    category: string;
    amount: string;
    percentage: number;
  }[]> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const results = await db
      .select({
        category: transactions.category,
        amount: sql<string>`SUM(amount)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'despesa'),
          gte(transactions.date, currentMonth)
        )
      )
      .groupBy(transactions.category);

    const totalExpenses = results.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return results.map(item => ({
      category: item.category,
      amount: item.amount,
      percentage: totalExpenses > 0 ? (parseFloat(item.amount) / totalExpenses) * 100 : 0
    }));
  }
}

export const storage = new DatabaseStorage();
