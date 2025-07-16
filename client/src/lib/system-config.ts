import { useQuery } from "@tanstack/react-query";

// Interface for system settings
export interface SystemSetting {
  id: number;
  key: string;
  value: any;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hook to get system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: ["/api/system-settings/public"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// Hook to get a specific setting value with fallback
export function useSystemSetting(key: string, fallback?: any) {
  const { data: settings } = useSystemSettings();
  
  const setting = settings?.find((s: SystemSetting) => s.key === key);
  return setting?.value ?? fallback;
}

// System configuration constants with fallbacks
export const SYSTEM_CONFIG = {
  // Trial settings
  TRIAL_DURATION_DAYS: "trial_duration_days",
  
  // Plan limits
  MAX_ACCOUNTS_BASIC: "max_accounts_basic",
  MAX_TRANSACTIONS_BASIC: "max_transactions_basic",
  MAX_ACCOUNTS_PREMIUM: "max_accounts_premium",
  MAX_TRANSACTIONS_PREMIUM: "max_transactions_premium",
  MAX_ACCOUNTS_ENTERPRISE: "max_accounts_enterprise",
  MAX_TRANSACTIONS_ENTERPRISE: "max_transactions_enterprise",
  
  // Currency and localization
  DEFAULT_CURRENCY: "default_currency",
  DEFAULT_LOCALE: "default_locale",
  CURRENCY_SYMBOL: "currency_symbol",
  
  // Security settings
  MAX_LOGIN_ATTEMPTS: "max_login_attempts",
  PASSWORD_MIN_LENGTH: "password_min_length",
  SESSION_TIMEOUT_MINUTES: "session_timeout_minutes",
  
  // Features
  EMAIL_NOTIFICATIONS_ENABLED: "email_notifications_enabled",
  BACKUP_ENABLED: "backup_enabled",
  MAINTENANCE_MODE: "maintenance_mode",
  
  // Support
  SUPPORT_EMAIL: "support_email",
  SUPPORT_PHONE: "support_phone",
  COMPANY_NAME: "company_name",
  
  // Payments
  STRIPE_WEBHOOK_ENDPOINT: "stripe_webhook_endpoint",
  
  // Landing page
  LANDING_HERO_TITLE: "landing_hero_title",
  LANDING_HERO_SUBTITLE: "landing_hero_subtitle",
  LANDING_CTA_TEXT: "landing_cta_text",
} as const;

// Default values for fallback
export const DEFAULT_VALUES = {
  [SYSTEM_CONFIG.TRIAL_DURATION_DAYS]: 14,
  [SYSTEM_CONFIG.MAX_ACCOUNTS_BASIC]: 5,
  [SYSTEM_CONFIG.MAX_TRANSACTIONS_BASIC]: 1000,
  [SYSTEM_CONFIG.MAX_ACCOUNTS_PREMIUM]: -1, // -1 means unlimited
  [SYSTEM_CONFIG.MAX_TRANSACTIONS_PREMIUM]: -1,
  [SYSTEM_CONFIG.MAX_ACCOUNTS_ENTERPRISE]: -1,
  [SYSTEM_CONFIG.MAX_TRANSACTIONS_ENTERPRISE]: -1,
  [SYSTEM_CONFIG.DEFAULT_CURRENCY]: "AOA",
  [SYSTEM_CONFIG.DEFAULT_LOCALE]: "pt-AO",
  [SYSTEM_CONFIG.CURRENCY_SYMBOL]: "Kz",
  [SYSTEM_CONFIG.MAX_LOGIN_ATTEMPTS]: 5,
  [SYSTEM_CONFIG.PASSWORD_MIN_LENGTH]: 8,
  [SYSTEM_CONFIG.SESSION_TIMEOUT_MINUTES]: 60,
  [SYSTEM_CONFIG.EMAIL_NOTIFICATIONS_ENABLED]: true,
  [SYSTEM_CONFIG.BACKUP_ENABLED]: true,
  [SYSTEM_CONFIG.MAINTENANCE_MODE]: false,
  [SYSTEM_CONFIG.SUPPORT_EMAIL]: "suporte@financecontrol.com",
  [SYSTEM_CONFIG.SUPPORT_PHONE]: "+244 900 000 000",
  [SYSTEM_CONFIG.COMPANY_NAME]: "Sistema de Controle Financeiro",
  [SYSTEM_CONFIG.STRIPE_WEBHOOK_ENDPOINT]: "/api/webhooks/stripe",
  [SYSTEM_CONFIG.LANDING_HERO_TITLE]: "Controle Financeiro Inteligente",
  [SYSTEM_CONFIG.LANDING_HERO_SUBTITLE]: "Gerencie suas finanças pessoais com facilidade e segurança",
  [SYSTEM_CONFIG.LANDING_CTA_TEXT]: "Comece seu teste gratuito",
};

// Utility function to get setting value with fallback
export function getSettingValue(settings: SystemSetting[] | undefined, key: string, fallback?: any): any {
  const setting = settings?.find(s => s.key === key);
  return setting?.value ?? fallback ?? DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES];
}