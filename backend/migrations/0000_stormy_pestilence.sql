CREATE TYPE "public"."account_type" AS ENUM('corrente', 'poupanca');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'quarterly', 'yearly', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('alimentacao', 'moradia', 'transporte', 'lazer', 'saude', 'educacao', 'salario', 'freelance', 'investimentos', 'outros');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('basic', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('failed_login', 'brute_force', 'suspicious_activity', 'ip_blocked', 'password_attempt', 'account_locked');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pendente', 'pago', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('receita', 'despesa');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"name" varchar(255) NOT NULL,
	"type" "account_type" NOT NULL,
	"bank" varchar(255) NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"interest_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" "admin_role" DEFAULT 'admin',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer,
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" integer,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_ips" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"reason" varchar(255) NOT NULL,
	"blocked_by" integer,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blocked_ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "campaign_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"used_at" timestamp DEFAULT now(),
	"discount_amount" numeric(10, 2),
	"original_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"plan_type" "plan_type" NOT NULL,
	"stripe_session_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" varchar(50),
	"discount_value" numeric(10, 2),
	"coupon_code" varchar(100),
	"valid_from" timestamp,
	"valid_until" timestamp,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"applicable_plans" jsonb DEFAULT '[]'::jsonb,
	"min_amount" numeric(10, 2) DEFAULT '0',
	"max_discount" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaigns_coupon_code_unique" UNIQUE("coupon_code")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"name" varchar(255) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"color" varchar(7),
	"icon" varchar(50),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"account_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"creditor" varchar(255) NOT NULL,
	"interest_rate" numeric(5, 2),
	"due_date" timestamp,
	"status" "status" DEFAULT 'pendente' NOT NULL,
	"description" text,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"section" varchar(100) NOT NULL,
	"content" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"version" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"account_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"borrower" varchar(255) NOT NULL,
	"interest_rate" numeric(5, 2),
	"due_date" timestamp,
	"status" "status" DEFAULT 'pendente' NOT NULL,
	"description" text,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"owner_id" integer NOT NULL,
	"plan_type" "plan_type" DEFAULT 'basic',
	"subscription_status" "subscription_status" DEFAULT 'trialing',
	"max_users" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"code" varchar(6),
	"type" varchar(20) DEFAULT 'email' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"payment_proof" text,
	"bank_reference" varchar(255),
	"phone_number" varchar(20),
	"payment_date" timestamp,
	"notes" text,
	"admin_notes" text,
	"status" varchar(20) DEFAULT 'pending',
	"verified_by" integer,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_instant" boolean DEFAULT false,
	"wait_time_seconds" integer DEFAULT 60,
	"max_wait_time_seconds" integer DEFAULT 3600,
	"requires_phone" boolean DEFAULT false,
	"requires_email" boolean DEFAULT false,
	"requires_reference" boolean DEFAULT false,
	"config" jsonb,
	"instructions" text,
	"processing_time" varchar(100),
	"fees" varchar(100),
	"icon" varchar(100),
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_methods_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"payment_method_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'AOA',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_reference" varchar(255),
	"stripe_session_id" varchar(255),
	"campaign_id" integer,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"final_amount" numeric(10, 2) NOT NULL,
	"metadata" jsonb,
	"processed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "plan_type" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"stripe_price_id" varchar(255),
	"features" jsonb NOT NULL,
	"max_accounts" integer DEFAULT 5,
	"max_transactions" integer DEFAULT 1000,
	"max_users" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"duration_days" integer,
	"trial_days" integer DEFAULT 0,
	"trial_one_time_only" boolean DEFAULT true,
	"max_free_days" integer,
	"billing_cycle" varchar(20) DEFAULT 'monthly',
	"description" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"account_id" integer,
	"name" varchar(255) NOT NULL,
	"target_amount" numeric(10, 2) NOT NULL,
	"current_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"target_date" timestamp,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" "security_event_type" NOT NULL,
	"severity" "severity" NOT NULL,
	"description" text NOT NULL,
	"ip_address" varchar(45),
	"location" varchar(255),
	"user_agent" text,
	"details" jsonb,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"days_before" integer,
	"sent_at" timestamp,
	"channel" varchar(20) DEFAULT 'email',
	"status" varchar(20) DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_id" varchar(255),
	"reference_code" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"plan_id" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"payment_type" varchar(50) DEFAULT 'one_time' NOT NULL,
	"payment_method" varchar(50),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"trial_ends_at" timestamp,
	"next_billing_date" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"trial_used" boolean DEFAULT false,
	"is_first_subscription" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"invited_by" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"category" varchar(255) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"account_id" integer,
	"date" timestamp NOT NULL,
	"balance_before" numeric(10, 2),
	"balance_after" numeric(10, 2),
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" varchar(50),
	"recurring_parent_id" integer,
	"receipt_path" varchar(500),
	"receipt_mime_type" varchar(100),
	"receipt_original_name" varchar(255),
	"receipt_file_size" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"from_account_id" integer NOT NULL,
	"to_account_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"subscription_status" "subscription_status" DEFAULT 'trialing',
	"plan_type" "plan_type" DEFAULT 'basic',
	"trial_ends_at" timestamp,
	"organization_id" integer,
	"role" varchar(50) DEFAULT 'member',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_ips" ADD CONSTRAINT "blocked_ips_blocked_by_admin_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_usage" ADD CONSTRAINT "campaign_usage_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_usage" ADD CONSTRAINT "campaign_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_transaction_id_payment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_verified_by_admin_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_notifications" ADD CONSTRAINT "subscription_notifications_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_notifications" ADD CONSTRAINT "subscription_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_parent_id_transactions_id_fk" FOREIGN KEY ("recurring_parent_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");