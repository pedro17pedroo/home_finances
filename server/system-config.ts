import { db } from './db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Cache for system settings
let settingsCache: Record<string, any> = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load all system settings into cache
export async function loadSystemSettings(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_TTL && Object.keys(settingsCache).length > 0) {
      return; // Use cached settings
    }

    const settings = await db.select().from(systemSettings);
    settingsCache = {};
    
    settings.forEach(setting => {
      settingsCache[setting.key] = setting.value;
    });
    
    lastCacheUpdate = now;
  } catch (error) {
    console.error('Error loading system settings:', error);
  }
}

// Get a system setting value with fallback
export async function getSystemSetting(key: string, fallback?: any): Promise<any> {
  await loadSystemSettings();
  return settingsCache[key] ?? fallback;
}

// Get multiple system settings at once
export async function getSystemSettings(keys: string[]): Promise<Record<string, any>> {
  await loadSystemSettings();
  const result: Record<string, any> = {};
  
  keys.forEach(key => {
    result[key] = settingsCache[key];
  });
  
  return result;
}

// System configuration constants with database-driven values
export class SystemConfig {
  // Trial settings
  static async getTrialDurationDays(): Promise<number> {
    return await getSystemSetting('trial_duration_days', 14);
  }
  
  // Plan limits - now database-driven
  static async getPlanLimits() {
    const settings = await getSystemSettings([
      'max_accounts_basic',
      'max_transactions_basic',
      'max_accounts_premium', 
      'max_transactions_premium',
      'max_accounts_enterprise',
      'max_transactions_enterprise'
    ]);
    
    return {
      basic: {
        maxAccounts: settings.max_accounts_basic ?? 5,
        maxTransactionsPerMonth: settings.max_transactions_basic ?? 1000,
      },
      premium: {
        maxAccounts: settings.max_accounts_premium ?? -1, // -1 = unlimited
        maxTransactionsPerMonth: settings.max_transactions_premium ?? -1,
      },
      enterprise: {
        maxAccounts: settings.max_accounts_enterprise ?? -1,
        maxTransactionsPerMonth: settings.max_transactions_enterprise ?? -1,
      }
    };
  }
  
  // Currency settings
  static async getDefaultCurrency(): Promise<string> {
    return await getSystemSetting('default_currency', 'AOA');
  }
  
  static async getDefaultLocale(): Promise<string> {
    return await getSystemSetting('default_locale', 'pt-AO');
  }
  
  static async getCurrencySymbol(): Promise<string> {
    return await getSystemSetting('currency_symbol', 'Kz');
  }
  
  // Security settings
  static async getMaxLoginAttempts(): Promise<number> {
    return await getSystemSetting('max_login_attempts', 5);
  }
  
  static async getPasswordMinLength(): Promise<number> {
    return await getSystemSetting('password_min_length', 8);
  }
  
  static async getSessionTimeoutMinutes(): Promise<number> {
    return await getSystemSetting('session_timeout_minutes', 60);
  }
  
  // System settings
  static async isMaintenanceMode(): Promise<boolean> {
    return await getSystemSetting('maintenance_mode', false);
  }
  
  static async isEmailNotificationsEnabled(): Promise<boolean> {
    return await getSystemSetting('email_notifications_enabled', true);
  }
  
  // Support settings
  static async getSupportEmail(): Promise<string> {
    return await getSystemSetting('support_email', 'suporte@financecontrol.com');
  }
  
  static async getSupportPhone(): Promise<string> {
    return await getSystemSetting('support_phone', '+244 900 000 000');
  }
  
  static async getCompanyName(): Promise<string> {
    return await getSystemSetting('company_name', 'Sistema de Controle Financeiro');
  }
  
  // Landing page settings
  static async getLandingHeroTitle(): Promise<string> {
    return await getSystemSetting('landing_hero_title', 'Controle Financeiro Inteligente');
  }
  
  static async getLandingHeroSubtitle(): Promise<string> {
    return await getSystemSetting('landing_hero_subtitle', 'Gerencie suas finanças pessoais com facilidade e segurança');
  }
  
  static async getLandingCtaText(): Promise<string> {
    return await getSystemSetting('landing_cta_text', 'Comece seu teste gratuito');
  }
}

// Initialize settings cache on startup
loadSystemSettings().catch(console.error);