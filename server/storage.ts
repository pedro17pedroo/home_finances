import { 
  accounts, 
  transactions, 
  transfers,
  savingsGoals, 
  loans, 
  debts, 
  categories,
  users,
  plans,
  organizations,
  teamInvitations,
  type Account, 
  type InsertAccount,
  type Transaction, 
  type InsertTransaction,
  type Transfer,
  type InsertTransfer,
  type SavingsGoal,
  type InsertSavingsGoal,
  type Loan,
  type InsertLoan,
  type Debt,
  type InsertDebt,
  type Category,
  type InsertCategory,
  type User,
  type InsertUser,
  type Plan,
  type InsertPlan,
  type Organization,
  type InsertOrganization,
  type TeamInvitation,
  type InsertTeamInvitation
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, sum, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmailOrPhone(emailOrPhone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  updateUserSubscription(id: number, subscriptionStatus: string, planType: string): Promise<User>;
  cancelUserSubscription(id: number): Promise<User>;

  // Plans
  getPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;

  // Accounts
  getAccounts(userId: number): Promise<Account[]>;
  getAccount(id: number, userId: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>, userId: number): Promise<Account>;
  deleteAccount(id: number, userId: number): Promise<void>;

  // Transactions
  getTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  getTransaction(id: number, userId: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>, userId: number): Promise<Transaction>;
  deleteTransaction(id: number, userId: number): Promise<void>;
  getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionsByCategory(userId: number, category: string): Promise<Transaction[]>;

  // Transfers
  getTransfers(userId: number): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;

  // Savings Goals
  getSavingsGoals(userId: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number, userId: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, goal: Partial<InsertSavingsGoal>, userId: number): Promise<SavingsGoal>;
  deleteSavingsGoal(id: number, userId: number): Promise<void>;

  // Loans
  getLoans(userId: number): Promise<Loan[]>;
  getLoan(id: number, userId: number): Promise<Loan | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>, userId: number): Promise<Loan>;
  deleteLoan(id: number, userId: number): Promise<void>;

  // Debts
  getDebts(userId: number): Promise<Debt[]>;
  getDebt(id: number, userId: number): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>, userId: number): Promise<Debt>;
  deleteDebt(id: number, userId: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Organizations (Multi-user support)
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization>;
  getOrganizationMembers(organizationId: number): Promise<User[]>;
  removeUserFromOrganization(userId: number, organizationId: number): Promise<void>;
  
  // Team Invitations
  getTeamInvitations(organizationId: number): Promise<TeamInvitation[]>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  acceptTeamInvitation(token: string, userId: number): Promise<void>;
  deleteTeamInvitation(id: number): Promise<void>;

  // Dashboard data
  getFinancialSummary(userId: number): Promise<{
    currentAccountBalance: string;
    totalSavings: string;
    totalDebts: string;
    totalLoans: string;
  }>;
  getMonthlyTransactionsSummary(userId: number): Promise<{
    income: string;
    expenses: string;
    month: string;
  }[]>;
  getExpensesByCategory(userId: number): Promise<{
    category: string;
    amount: string;
    percentage: number;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmailOrPhone(emailOrPhone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`${users.email} = ${emailOrPhone} OR ${users.phone} = ${emailOrPhone}`
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, insertUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(insertUser).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const updateData: any = { stripeCustomerId };
    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserSubscription(id: number, subscriptionStatus: string, planType: string): Promise<User> {
    const [user] = await db.update(users).set({ 
      subscriptionStatus: subscriptionStatus as any, 
      planType: planType as any,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }

  async cancelUserSubscription(id: number): Promise<User> {
    const [user] = await db.update(users).set({ 
      subscriptionStatus: 'canceled',
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }

  // Plans
  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true));
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(insertPlan).returning();
    return plan;
  }

  // Accounts
  async getAccounts(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccount(id: number, userId: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(
      and(eq(accounts.id, id), eq(accounts.userId, userId))
    );
    return account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: number, insertAccount: Partial<InsertAccount>, userId: number): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...insertAccount, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return account;
  }

  // Helper method to update account balance based on transactions
  async updateAccountBalance(accountId: number, userId: number): Promise<void> {
    // Calculate total balance from transactions
    const accountTransactions = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId)
      ));

    let balance = 0;
    for (const transaction of accountTransactions) {
      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'receita') {
        balance += amount;
      } else if (transaction.type === 'despesa') {
        balance -= amount;
      }
    }

    // Update the account with the calculated balance
    await db
      .update(accounts)
      .set({ 
        balance: balance.toFixed(2), 
        updatedAt: new Date() 
      })
      .where(and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId)
      ));
  }

  async deleteAccount(id: number, userId: number): Promise<void> {
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  }

  // Transactions
  async getTransactions(userId: number, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransaction(id: number, userId: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(
      and(eq(transactions.id, id), eq(transactions.userId, userId))
    );
    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    
    // Update account balance if accountId is provided
    if (transaction.accountId) {
      await this.updateAccountBalance(transaction.accountId, transaction.userId);
    }
    
    return transaction;
  }

  async updateTransaction(id: number, insertTransaction: Partial<InsertTransaction>, userId: number): Promise<Transaction> {
    // Get the old transaction to check if account changed
    const oldTransaction = await this.getTransaction(id, userId);
    
    const [transaction] = await db
      .update(transactions)
      .set({ ...insertTransaction, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    
    // Update account balances
    if (oldTransaction?.accountId) {
      await this.updateAccountBalance(oldTransaction.accountId, userId);
    }
    if (transaction.accountId && transaction.accountId !== oldTransaction?.accountId) {
      await this.updateAccountBalance(transaction.accountId, userId);
    }
    
    return transaction;
  }

  async deleteTransaction(id: number, userId: number): Promise<void> {
    // Get the transaction before deleting to update account balance
    const transaction = await this.getTransaction(id, userId);
    
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    
    // Update account balance if accountId was set
    if (transaction?.accountId) {
      await this.updateAccountBalance(transaction.accountId, userId);
    }
  }

  async getTransactionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate), 
        lte(transactions.date, endDate)
      ))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByCategory(userId: number, category: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        sql`${transactions.category} = ${category}`
      ))
      .orderBy(desc(transactions.date));
  }

  // Savings Goals
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async getSavingsGoal(id: number, userId: number): Promise<SavingsGoal | undefined> {
    const [goal] = await db.select().from(savingsGoals).where(
      and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId))
    );
    return goal;
  }

  async createSavingsGoal(insertGoal: InsertSavingsGoal): Promise<SavingsGoal> {
    const [goal] = await db.insert(savingsGoals).values(insertGoal).returning();
    return goal;
  }

  async updateSavingsGoal(id: number, insertGoal: Partial<InsertSavingsGoal>, userId: number): Promise<SavingsGoal> {
    const [goal] = await db
      .update(savingsGoals)
      .set({ ...insertGoal, updatedAt: new Date() })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning();
    return goal;
  }

  async deleteSavingsGoal(id: number, userId: number): Promise<void> {
    await db.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  }

  // Loans
  async getLoans(userId: number): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.createdAt));
  }

  async getLoan(id: number, userId: number): Promise<Loan | undefined> {
    const [loan] = await db.select().from(loans).where(
      and(eq(loans.id, id), eq(loans.userId, userId))
    );
    return loan;
  }

  async createLoan(insertLoan: InsertLoan): Promise<Loan> {
    const [loan] = await db.insert(loans).values(insertLoan).returning();
    return loan;
  }

  async updateLoan(id: number, insertLoan: Partial<InsertLoan>, userId: number): Promise<Loan> {
    const [loan] = await db
      .update(loans)
      .set({ ...insertLoan, updatedAt: new Date() })
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .returning();
    return loan;
  }

  async deleteLoan(id: number, userId: number): Promise<void> {
    await db.delete(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
  }

  // Debts
  async getDebts(userId: number): Promise<Debt[]> {
    return await db
      .select()
      .from(debts)
      .where(eq(debts.userId, userId))
      .orderBy(desc(debts.createdAt));
  }

  async getDebt(id: number, userId: number): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(
      and(eq(debts.id, id), eq(debts.userId, userId))
    );
    return debt;
  }

  async createDebt(insertDebt: InsertDebt): Promise<Debt> {
    const [debt] = await db.insert(debts).values(insertDebt).returning();
    return debt;
  }

  async updateDebt(id: number, insertDebt: Partial<InsertDebt>, userId: number): Promise<Debt> {
    const [debt] = await db
      .update(debts)
      .set({ ...insertDebt, updatedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .returning();
    return debt;
  }

  async deleteDebt(id: number, userId: number): Promise<void> {
    await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(desc(categories.createdAt));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, insertCategory: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(insertCategory)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Transfers
  async getTransfers(userId: number): Promise<Transfer[]> {
    return await db
      .select({
        id: transfers.id,
        userId: transfers.userId,
        fromAccountId: transfers.fromAccountId,
        toAccountId: transfers.toAccountId,
        amount: transfers.amount,
        description: transfers.description,
        date: transfers.date,
        createdAt: transfers.createdAt,
        updatedAt: transfers.updatedAt,
      })
      .from(transfers)
      .where(eq(transfers.userId, userId))
      .orderBy(desc(transfers.date));
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    // Start a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // Get the fromAccount and toAccount
      const fromAccount = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, insertTransfer.fromAccountId), eq(accounts.userId, insertTransfer.userId)));
      
      const toAccount = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, insertTransfer.toAccountId), eq(accounts.userId, insertTransfer.userId)));

      if (fromAccount.length === 0 || toAccount.length === 0) {
        throw new Error('One or both accounts not found');
      }

      // Check if from account has sufficient balance
      const fromBalance = parseFloat(fromAccount[0].balance);
      const transferAmount = parseFloat(insertTransfer.amount);
      
      if (fromBalance < transferAmount) {
        throw new Error('Insufficient balance in source account');
      }

      // Create the transfer record
      const [transfer] = await tx.insert(transfers).values(insertTransfer).returning();

      // Update account balances
      await tx
        .update(accounts)
        .set({ 
          balance: (fromBalance - transferAmount).toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(accounts.id, insertTransfer.fromAccountId));

      const toBalance = parseFloat(toAccount[0].balance);
      await tx
        .update(accounts)
        .set({ 
          balance: (toBalance + transferAmount).toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(accounts.id, insertTransfer.toAccountId));

      return transfer;
    });

    return result;
  }

  // Organizations (Multi-user support)
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async createOrganization(insertOrganization: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(insertOrganization).returning();
    return organization;
  }

  async updateOrganization(id: number, insertOrganization: Partial<InsertOrganization>): Promise<Organization> {
    const [organization] = await db
      .update(organizations)
      .set({ ...insertOrganization, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  }

  async getOrganizationMembers(organizationId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(users.createdAt));
  }

  async removeUserFromOrganization(userId: number, organizationId: number): Promise<void> {
    await db
      .update(users)
      .set({ organizationId: null, role: 'member' })
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));
  }

  // Team Invitations
  async getTeamInvitations(organizationId: number): Promise<TeamInvitation[]> {
    return await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.organizationId, organizationId))
      .orderBy(desc(teamInvitations.createdAt));
  }

  async createTeamInvitation(insertInvitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [invitation] = await db.insert(teamInvitations).values(insertInvitation).returning();
    return invitation;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.token, token), sql`${teamInvitations.expiresAt} > NOW()`));
    return invitation;
  }

  async acceptTeamInvitation(token: string, userId: number): Promise<void> {
    const invitation = await this.getTeamInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Update user to join organization
    await db
      .update(users)
      .set({ 
        organizationId: invitation.organizationId,
        role: invitation.role 
      })
      .where(eq(users.id, userId));

    // Mark invitation as accepted
    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.token, token));
  }

  async deleteTeamInvitation(id: number): Promise<void> {
    await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
  }

  // Dashboard data
  async getFinancialSummary(userId: number): Promise<{
    currentAccountBalance: string;
    totalSavings: string;
    totalDebts: string;
    totalLoans: string;
  }> {
    const accountBalance = await db
      .select({ total: sum(accounts.balance) })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const savingsTotal = await db
      .select({ total: sum(savingsGoals.currentAmount) })
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId));

    const debtsTotal = await db
      .select({ total: sum(debts.amount) })
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.status, 'pendente')));

    const loansTotal = await db
      .select({ total: sum(loans.amount) })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.status, 'pendente')));

    return {
      currentAccountBalance: accountBalance[0]?.total || "0.00",
      totalSavings: savingsTotal[0]?.total || "0.00",
      totalDebts: debtsTotal[0]?.total || "0.00",
      totalLoans: loansTotal[0]?.total || "0.00",
    };
  }

  async getMonthlyTransactionsSummary(userId: number): Promise<{
    income: string;
    expenses: string;
    month: string;
  }[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${transactions.date})`,
        income: sql`SUM(CASE WHEN ${transactions.type} = 'receita' THEN ${transactions.amount} ELSE 0 END)`,
        expenses: sql`SUM(CASE WHEN ${transactions.type} = 'despesa' THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, sixMonthsAgo)
      ))
      .groupBy(sql`DATE_TRUNC('month', ${transactions.date})`)
      .orderBy(sql`DATE_TRUNC('month', ${transactions.date})`);

    return monthlyData.map(row => ({
      month: row.month as string,
      income: row.income as string || "0.00",
      expenses: row.expenses as string || "0.00",
    }));
  }

  async getExpensesByCategory(userId: number): Promise<{
    category: string;
    amount: string;
    percentage: number;
  }[]> {
    const totalExpenses = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'despesa')));

    const total = parseFloat(totalExpenses[0]?.total || "0");

    if (total === 0) return [];

    const categoryTotals = await db
      .select({
        category: transactions.category,
        amount: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'despesa')))
      .groupBy(transactions.category);

    return categoryTotals.map(row => ({
      category: row.category,
      amount: row.amount as string,
      percentage: Math.round((parseFloat(row.amount as string) / total) * 100),
    }));
  }
}

export const storage = new DatabaseStorage();