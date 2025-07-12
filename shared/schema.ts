import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['receita', 'despesa']);
export const statusEnum = pgEnum('status', ['pendente', 'pago', 'cancelado']);
export const accountTypeEnum = pgEnum('account_type', ['corrente', 'poupanca']);
export const categoryEnum = pgEnum('category', [
  'alimentacao', 'moradia', 'transporte', 'lazer', 'saude', 'educacao', 
  'salario', 'freelance', 'investimentos', 'outros'
]);

// Contas bancárias
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  bank: varchar("bank", { length: 255 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Categorias customizadas
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow()
});

// Transações (receitas e despesas)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull(),
  type: transactionTypeEnum("type").notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  date: timestamp("date").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: varchar("recurring_frequency", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Metas de poupança
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  targetDate: timestamp("target_date"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Empréstimos dados
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  borrower: varchar("borrower", { length: 255 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  status: statusEnum("status").notNull().default('pendente'),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Dívidas
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  creditor: varchar("creditor", { length: 255 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  status: statusEnum("status").notNull().default('pendente'),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

// Insert schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDebtSchema = createInsertSchema(debts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
