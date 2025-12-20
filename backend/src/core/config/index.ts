import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("5000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  REDIS_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

function validateConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment configuration:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

const validatedConfig = validateConfig();

export const config = {
  ...validatedConfig,
  isDevelopment: validatedConfig.NODE_ENV === "development",
  isProduction: validatedConfig.NODE_ENV === "production",
  isTest: validatedConfig.NODE_ENV === "test",
};

export const isDevelopment = config.isDevelopment;
export const isProduction = config.isProduction;
export const isTest = config.isTest;