import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
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
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'trialing']);
export const planTypeEnum = pgEnum('plan_type', ['basic', 'premium', 'enterprise']);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default('trialing'),
  planType: planTypeEnum("plan_type").default('basic'),
  trialEndsAt: timestamp("trial_ends_at"),
  organizationId: integer("organization_id").references(() => organizations.id),
  role: varchar("role", { length: 50 }).default('member'), // 'owner', 'admin', 'member'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table for multi-user support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  planType: planTypeEnum("plan_type").default('basic'),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default('trialing'),
  maxUsers: integer("max_users").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team invitations table
export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default('member'),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Plans table
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: planTypeEnum("type").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  features: jsonb("features").notNull(),
  maxAccounts: integer("max_accounts").default(5),
  maxTransactions: integer("max_transactions").default(1000),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contas bancárias
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
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
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull(),
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
  userId: integer("user_id").references(() => users.id).notNull(),
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
  userId: integer("user_id").references(() => users.id).notNull(),
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
  userId: integer("user_id").references(() => users.id).notNull(),
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
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  ownedOrganizations: many(organizations),
  sentInvitations: many(teamInvitations),
  accounts: many(accounts),
  transactions: many(transactions),
  savingsGoals: many(savingsGoals),
  loans: many(loans),
  debts: many(debts),
}));

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  transactions: many(transactions),
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  user: one(users, {
    fields: [debts.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(users),
  invitations: many(teamInvitations),
}));



export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamInvitations.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id],
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

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true
});

// Authentication schemas
export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email ou telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório")
}).refine(data => data.email || data.phone, {
  message: "Email ou telefone é obrigatório",
  path: ["emailOrPhone"]
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

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

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
