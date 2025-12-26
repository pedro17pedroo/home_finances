-- Admin Password Reset Tokens table
CREATE TABLE IF NOT EXISTS "admin_password_reset_tokens" (
  "id" SERIAL PRIMARY KEY,
  "admin_user_id" INTEGER NOT NULL REFERENCES "admin_users"("id"),
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMP NOT NULL,
  "used_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS "idx_admin_password_reset_tokens_token" ON "admin_password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_admin_password_reset_tokens_admin_user_id" ON "admin_password_reset_tokens"("admin_user_id");
