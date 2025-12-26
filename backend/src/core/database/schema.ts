import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, pgEnum, jsonb, index, unique } from "drizzle-orm/pg-core";
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
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin']);
export const securityEventTypeEnum = pgEnum('security_event_type', ['failed_login', 'brute_force', 'suspicious_activity', 'ip_blocked', 'password_attempt', 'account_locked']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical']);

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
  organizationId: integer("organization_id"),
  activeOrganizationId: integer("active_organization_id"),
  role: varchar("role", { length: 50 }).default('member'), // 'owner', 'admin', 'member'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table for multi-user support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: integer("owner_id").notNull(),
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
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }).default('member'),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization memberships table for multi-organization support
export const organizationMemberships = pgTable("organization_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default('member'), // 'owner', 'admin', 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: integer("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueMembership: unique().on(table.userId, table.organizationId),
  userIdx: index("idx_memberships_user").on(table.userId),
  orgIdx: index("idx_memberships_org").on(table.organizationId),
}));

// Billing cycle enum
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'quarterly', 'yearly', 'one_time']);

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
  maxUsers: integer("max_users").default(1), // Limite de utilizadores por organização
  isActive: boolean("is_active").default(true),
  // New fields for subscription management
  durationDays: integer("duration_days"), // null = unlimited
  trialDays: integer("trial_days").default(0),
  trialOneTimeOnly: boolean("trial_one_time_only").default(true), // Trial só pode ser usado uma vez
  maxFreeDays: integer("max_free_days"), // Limite de dias para planos gratuitos
  billingCycle: varchar("billing_cycle", { length: 20 }).default('monthly'),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Users table - for support team
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: adminRoleEnum("role").default('admin'),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Settings table
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security logs table for tracking security events
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  eventType: securityEventTypeEnum("event_type").notNull(),
  severity: severityEnum("severity").notNull(),
  description: text("description").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  location: varchar("location", { length: 255 }),
  userAgent: text("user_agent"),
  details: jsonb("details"), // Additional event details
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blocked IPs table
export const blockedIPs = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }).notNull(),
  blockedBy: integer("blocked_by").references(() => adminUsers.id),
  expiresAt: timestamp("expires_at"), // Optional auto-unblock
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table - TPagamento integration
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  planId: varchar("plan_id", { length: 50 }).notNull(), // 'free', 'basic', 'premium'
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'active', 'trial', 'expired', 'cancelled', 'pending'
  paymentType: varchar("payment_type", { length: 50 }).notNull().default('one_time'), // 'one_time', 'recurring'
  paymentMethod: varchar("payment_method", { length: 50 }), // 'ekwanza', 'gpo', 'ref'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // New fields for subscription management
  trialEndsAt: timestamp("trial_ends_at"),
  nextBillingDate: timestamp("next_billing_date"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  trialUsed: boolean("trial_used").default(false), // Se o trial já foi usado
  isFirstSubscription: boolean("is_first_subscription").default(false), // Se é a primeira subscrição
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Payments table - TPagamento transactions
export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // 'ekwanza', 'gpo', 'ref'
  paymentId: varchar("payment_id", { length: 255 }), // External payment ID
  referenceCode: varchar("reference_code", { length: 255 }), // For E-Kwanza
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'paid', 'failed', 'expired'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Notifications table - for expiration and trial notifications
export const subscriptionNotifications = pgTable("subscription_notifications", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'trial_ending', 'expiring', 'expired', 'payment_reminder'
  daysBefore: integer("days_before"), // Days before the event (7, 3, 1, 0)
  sentAt: timestamp("sent_at"),
  channel: varchar("channel", { length: 20 }).default('email'), // 'email', 'sms', 'push'
  status: varchar("status", { length: 20 }).default('pending'), // 'pending', 'sent', 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Methods table - for Phase 3
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 'ekwanza', 'gpo', 'ref', 'bank_transfer'
  name: varchar("name", { length: 100 }).notNull(), // 'E-Kwanza', 'Multicaixa Express', etc.
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"), // Descrição do método
  isActive: boolean("is_active").default(true),
  isInstant: boolean("is_instant").default(false), // true = pagamento instantâneo, false = requer confirmação
  waitTimeSeconds: integer("wait_time_seconds").default(60), // Tempo de espera para verificação (em segundos)
  maxWaitTimeSeconds: integer("max_wait_time_seconds").default(3600), // Tempo máximo de espera (1 hora)
  requiresPhone: boolean("requires_phone").default(false), // Requer número de telefone
  requiresEmail: boolean("requires_email").default(false), // Requer email
  requiresReference: boolean("requires_reference").default(false), // Gera referência de pagamento
  config: jsonb("config"), // Method-specific configurations
  instructions: text("instructions"), // Payment instructions for manual methods
  processingTime: varchar("processing_time", { length: 100 }), // "Imediato", "1-3 dias úteis", etc.
  fees: varchar("fees", { length: 100 }), // Fee information
  icon: varchar("icon", { length: 100 }), // Icon identifier (lucide icon name)
  logoUrl: varchar("logo_url", { length: 500 }), // URL da imagem do logotipo
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Transactions table - track all payments regardless of method
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => plans.id),
  paymentMethodId: integer("payment_method_id").notNull().references(() => paymentMethods.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('AOA'),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, completed, failed, cancelled, processing
  paymentReference: varchar("payment_reference", { length: 255 }), // External payment reference
  stripeSessionId: varchar("stripe_session_id", { length: 255 }), // For Stripe payments
  campaignId: integer("campaign_id").references(() => campaigns.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  metadata: jsonb("metadata"), // Additional payment data
  processedAt: timestamp("processed_at"),
  expiresAt: timestamp("expires_at"), // For pending payments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Confirmations table - for manual verification
export const paymentConfirmations = pgTable("payment_confirmations", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => paymentTransactions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  paymentProof: text("payment_proof"), // Base64 encoded image or file path
  bankReference: varchar("bank_reference", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }), // For mobile money
  paymentDate: timestamp("payment_date"),
  notes: text("notes"),
  adminNotes: text("admin_notes"), // Admin verification notes
  status: varchar("status", { length: 20 }).default('pending'), // pending, approved, rejected
  verifiedBy: integer("verified_by").references(() => adminUsers.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table - for Phase 3
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 50 }), // 'percentage', 'fixed_amount', 'free_trial'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  couponCode: varchar("coupon_code", { length: 100 }).unique(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  // New fields for subscription management
  applicablePlans: jsonb("applicable_plans").default([]), // Array of plan IDs
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).default('0'),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Usage table - tracks coupon usage by users
export const campaignUsage = pgTable("campaign_usage", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  planType: planTypeEnum("plan_type").notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
});

// Landing Content table - for Phase 4
export const landingContent = pgTable("landing_content", {
  id: serial("id").primaryKey(),
  section: varchar("section", { length: 100 }).notNull(), // 'hero', 'features', 'testimonials', 'pricing'
  content: jsonb("content").notNull(), // Structured content
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legal Content table - for Phase 4
export const legalContent = pgTable("legal_content", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }).notNull(), // 'terms', 'privacy', 'contacts', 'contracts'
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FAQ table
export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // 'geral', 'conta', 'pagamentos', 'seguranca'
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact messages table
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).default('pending'), // 'pending', 'read', 'replied', 'closed'
  adminNotes: text("admin_notes"),
  repliedAt: timestamp("replied_at"),
  repliedBy: integer("replied_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bancos disponíveis
export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  swiftCode: varchar("swift_code", { length: 20 }),
  country: varchar("country", { length: 2 }).default('AO'),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contas bancárias
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  bank: varchar("bank", { length: 255 }),
  bankId: integer("bank_id").references(() => banks.id),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Categorias customizadas (por organização)
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 50 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Transações (receitas e despesas)
export const transactions: any = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  date: timestamp("date").notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: varchar("recurring_frequency", { length: 50 }),
  recurringParentId: integer("recurring_parent_id").references(() => transactions.id),
  // Suporte para recibos
  receiptPath: varchar("receipt_path", { length: 500 }),
  receiptMimeType: varchar("receipt_mime_type", { length: 100 }),
  receiptOriginalName: varchar("receipt_original_name", { length: 255 }),
  receiptFileSize: integer("receipt_file_size"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Transferências entre contas
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  fromAccountId: integer("from_account_id").references(() => accounts.id).notNull(),
  toAccountId: integer("to_account_id").references(() => accounts.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Metas de poupança
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  accountId: integer("account_id").references(() => accounts.id), // Conta vinculada à meta
  name: varchar("name", { length: 255 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).notNull().default('0'), // Deprecated: use account balance
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
  organizationId: integer("organization_id").references(() => organizations.id),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  borrower: varchar("borrower", { length: 255 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  status: statusEnum("status").notNull().default('pendente'),
  description: text("description"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Dívidas
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  creditor: varchar("creditor", { length: 255 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  status: statusEnum("status").notNull().default('pendente'),
  description: text("description"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  activeOrganization: one(organizations, {
    fields: [users.activeOrganizationId],
    references: [organizations.id],
    relationName: "activeOrganization",
  }),
  ownedOrganizations: many(organizations),
  memberships: many(organizationMemberships),
  sentInvitations: many(teamInvitations),
  accounts: many(accounts),
  transactions: many(transactions),
  transfers: many(transfers),
  savingsGoals: many(savingsGoals),
  loans: many(loans),
  debts: many(debts),
}));

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  transactions: many(transactions),
  transfersFrom: many(transfers, { relationName: "fromAccount" }),
  transfersTo: many(transfers, { relationName: "toAccount" }),
  loans: many(loans),
  debts: many(debts),
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

export const transfersRelations = relations(transfers, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [transfers.fromAccountId],
    references: [accounts.id],
    relationName: "fromAccount",
  }),
  toAccount: one(accounts, {
    fields: [transfers.toAccountId],
    references: [accounts.id],
    relationName: "toAccount",
  }),
  user: one(users, {
    fields: [transfers.userId],
    references: [users.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [savingsGoals.accountId],
    references: [accounts.id],
  }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [loans.accountId],
    references: [accounts.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one }) => ({
  user: one(users, {
    fields: [debts.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [debts.accountId],
    references: [accounts.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(users),
  memberships: many(organizationMemberships),
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

// Organization Memberships Relations
export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [organizationMemberships.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

// Admin Users Relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

// Audit Logs Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [auditLogs.adminUserId],
    references: [adminUsers.id],
  }),
}));

// Campaign Relations
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  usage: many(campaignUsage),
}));

// Campaign Usage Relations
export const campaignUsageRelations = relations(campaignUsage, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignUsage.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignUsage.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
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

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Admin schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});

export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  createdAt: true,
  resolvedAt: true
});

export const insertBlockedIPSchema = createInsertSchema(blockedIPs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Phase 3 & 4 schemas
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignUsageSchema = createInsertSchema(campaignUsage).omit({
  id: true,
  usedAt: true
});

export const insertLandingContentSchema = createInsertSchema(landingContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLegalContentSchema = createInsertSchema(legalContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentConfirmationSchema = createInsertSchema(paymentConfirmations).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionNotificationSchema = createInsertSchema(subscriptionNotifications).omit({
  id: true,
  createdAt: true,
});

// Authentication schemas
export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email ou telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(9, "Telefone deve ter pelo menos 9 dígitos").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  planType: z.enum(['basic', 'premium', 'enterprise']).optional()
}).refine(data => data.email || data.phone, {
  message: "Email ou telefone é obrigatório",
  path: ["emailOrPhone"]
});

// Admin authentication schemas
export const adminLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = typeof savingsGoals.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = typeof debts.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = typeof organizationMemberships.$inferInsert;

// Admin types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Phase 3 & 4 types
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export type CampaignUsage = typeof campaignUsage.$inferSelect;
export type InsertCampaignUsage = typeof campaignUsage.$inferInsert;

export type LandingContent = typeof landingContent.$inferSelect;
export type InsertLandingContent = typeof landingContent.$inferInsert;

export type LegalContent = typeof legalContent.$inferSelect;
export type InsertLegalContent = typeof legalContent.$inferInsert;

export type FaqItem = typeof faqItems.$inferSelect;
export type InsertFaqItem = typeof faqItems.$inferInsert;

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type PaymentConfirmation = typeof paymentConfirmations.$inferSelect;
export type InsertPaymentConfirmation = typeof paymentConfirmations.$inferInsert;

// Subscription Management types
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = typeof subscriptionPayments.$inferInsert;

export type SubscriptionNotification = typeof subscriptionNotifications.$inferSelect;
export type InsertSubscriptionNotification = typeof subscriptionNotifications.$inferInsert;


// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 6 }), // For SMS verification
  type: varchar("type", { length: 20 }).notNull().default('email'), // 'email' or 'sms'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Admin Password Reset Tokens table
export const adminPasswordResetTokens = pgTable("admin_password_reset_tokens", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminPasswordResetToken = typeof adminPasswordResetTokens.$inferSelect;
export type InsertAdminPasswordResetToken = typeof adminPasswordResetTokens.$inferInsert;
