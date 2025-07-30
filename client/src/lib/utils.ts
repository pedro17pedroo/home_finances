import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number, currency?: string, locale?: string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
  
  // Use provided values or defaults
  const currencyCode = currency || 'AOA';
  const localeCode = locale || 'pt-AO';
  
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currencyCode,
  }).format(numValue);
}

// Hook-based currency formatter that uses system settings
export function useFormatCurrency() {
  const { useSystemSetting } = require('./system-config');
  const defaultCurrency = useSystemSetting('default_currency', 'AOA');
  const defaultLocale = useSystemSetting('default_locale', 'pt-AO');
  
  return (value: string | number, currency?: string, locale?: string) => {
    return formatCurrency(
      value, 
      currency || defaultCurrency, 
      locale || defaultLocale
    );
  };
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-AO').format(dateObj);
}

export function formatDateInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

export function calculatePercentage(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((current / target) * 100);
}

export function getMonthName(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-AO', { month: 'short', year: 'numeric' });
}

export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[^\d.-]/g, ''));
}

export function getFinancialTrend(current: number, previous: number): {
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) return { percentage: 0, direction: 'neutral' };
  
  const percentage = ((current - previous) / previous) * 100;
  
  return {
    percentage: Math.abs(percentage),
    direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral',
  };
}
