import { eq, and, sql } from "drizzle-orm";
import { db } from "../../core/database/db.js";
import { 
  budgets, 
  budgetAlerts,
  budgetHistory,
  type Budget, 
  type InsertBudget,
  type BudgetAlert,
  type InsertBudgetAlert,
  type BudgetHistory,
  type InsertBudgetHistory
} from "../../core/database/schema.js";

export class BudgetRepository {
  /**
   * Find a budget by ID
   */
  static async findById(id: number): Promise<Budget | null> {
    const result = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Find a budget by ID and organization (for multi-tenant isolation)
   */
  static async findByIdAndOrganization(id: number, organizationId: number): Promise<Budget | null> {
    const result = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, id),
        eq(budgets.organizationId, organizationId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Find all budgets for an organization
   */
  static async findAllByOrganization(organizationId: number): Promise<Budget[]> {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId))
      .orderBy(budgets.createdAt);
  }

  /**
   * Find budgets by organization with optional filters
   */
  static async findByOrganizationWithFilters(
    organizationId: number,
    filters?: {
      status?: string;
      categoryId?: number;
      timePeriod?: string;
    }
  ): Promise<Budget[]> {
    const conditions = [eq(budgets.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(budgets.status, filters.status));
    }

    if (filters?.categoryId) {
      conditions.push(eq(budgets.categoryId, filters.categoryId));
    }

    if (filters?.timePeriod) {
      conditions.push(eq(budgets.timePeriod, filters.timePeriod));
    }

    return db
      .select()
      .from(budgets)
      .where(and(...conditions))
      .orderBy(budgets.createdAt);
  }

  /**
   * Find active budgets by category and organization
   */
  static async findActiveByCategoryAndOrganization(
    categoryId: number,
    organizationId: number
  ): Promise<Budget[]> {
    return db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.categoryId, categoryId),
        eq(budgets.organizationId, organizationId),
        eq(budgets.status, 'active')
      ));
  }

  /**
   * Create a new budget
   */
  static async create(data: InsertBudget): Promise<Budget> {
    const result = await db
      .insert(budgets)
      .values(data)
      .returning();
    
    return result[0];
  }

  /**
   * Update a budget
   */
  static async update(id: number, data: Partial<InsertBudget>): Promise<Budget> {
    const result = await db
      .update(budgets)
      .set({
        ...data,
        updatedAt: sql`NOW()`,
      })
      .where(eq(budgets.id, id))
      .returning();
    
    return result[0];
  }

  /**
   * Delete a budget
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(budgets)
      .where(eq(budgets.id, id));
  }

  /**
   * Find all alerts for a budget
   */
  static async findAlertsByBudgetId(budgetId: number): Promise<BudgetAlert[]> {
    return db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.budgetId, budgetId))
      .orderBy(budgetAlerts.createdAt);
  }

  /**
   * Create a budget alert
   */
  static async createAlert(data: InsertBudgetAlert): Promise<BudgetAlert> {
    const result = await db
      .insert(budgetAlerts)
      .values(data)
      .returning();
    
    return result[0];
  }

  /**
   * Delete all alerts for a budget
   */
  static async deleteAlertsByBudgetId(budgetId: number): Promise<void> {
    await db
      .delete(budgetAlerts)
      .where(eq(budgetAlerts.budgetId, budgetId));
  }

  /**
   * Count alerts for a budget
   */
  static async countAlertsByBudgetId(budgetId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetAlerts)
      .where(eq(budgetAlerts.budgetId, budgetId));
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Check if a budget has historical data
   * Used to determine if budget should be archived instead of deleted
   */
  static async hasHistoricalData(budgetId: number): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetHistory)
      .where(eq(budgetHistory.budgetId, budgetId));
    
    return Number(result[0]?.count || 0) > 0;
  }

  /**
   * Create a budget history record
   * Used to archive budget period performance data
   */
  static async createBudgetHistory(data: InsertBudgetHistory): Promise<BudgetHistory> {
    const result = await db
      .insert(budgetHistory)
      .values(data)
      .returning();
    
    return result[0];
  }

  /**
   * Find all budget history records for a budget
   */
  static async findBudgetHistoryByBudgetId(budgetId: number): Promise<BudgetHistory[]> {
    return db
      .select()
      .from(budgetHistory)
      .where(eq(budgetHistory.budgetId, budgetId))
      .orderBy(budgetHistory.periodStartDate);
  }

  /**
   * Find budget history records for an organization
   * Used for multi-tenant isolation when retrieving archived periods
   */
  static async findBudgetHistoryByOrganization(organizationId: number): Promise<BudgetHistory[]> {
    // Join with budgets table to filter by organization
    const result = await db
      .select({
        id: budgetHistory.id,
        budgetId: budgetHistory.budgetId,
        periodStartDate: budgetHistory.periodStartDate,
        periodEndDate: budgetHistory.periodEndDate,
        finalSpendingAmount: budgetHistory.finalSpendingAmount,
        percentageUsed: budgetHistory.percentageUsed,
        alertsTriggered: budgetHistory.alertsTriggered,
        createdAt: budgetHistory.createdAt,
      })
      .from(budgetHistory)
      .innerJoin(budgets, eq(budgetHistory.budgetId, budgets.id))
      .where(eq(budgets.organizationId, organizationId))
      .orderBy(budgetHistory.periodStartDate);
    
    return result;
  }
}
