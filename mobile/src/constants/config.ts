import { Platform } from 'react-native';

// Configurações da aplicação
export const APP_CONFIG = {
  // API - Android emulator uses 10.0.2.2, physical device needs actual IP
  API_BASE_URL: __DEV__ 
    ? Platform.select({
        android: 'http://192.168.1.46:5001/api', // Your machine's IP
        ios: 'http://localhost:5001/api',
        default: 'http://localhost:5001/api',
      })!
    : 'https://your-production-api.com/api',
  
  // Cache
  CACHE_TTL_MINUTES: 30,
  CACHE_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,
  
  // Performance
  DEBOUNCE_DELAY: 500,
  THROTTLE_DELAY: 1000,
  
  // Offline
  MAX_OFFLINE_RETRIES: 3,
  OFFLINE_QUEUE_SIZE_LIMIT: 100,
  
  // Analytics
  ANALYTICS_ENABLED: !__DEV__,
  
  // UI
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Validation
  MIN_PASSWORD_LENGTH: 6,
  MAX_DESCRIPTION_LENGTH: 255,
  
  // Currency
  DEFAULT_CURRENCY: 'AOA',
  CURRENCY_SYMBOL: 'Kz',
  
  // Date formats
  DATE_FORMAT: 'DD/MM/YYYY',
  DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
  
  // File upload
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
} as const;

// API Config
export const API_CONFIG = {
  BASE_URL: APP_CONFIG.API_BASE_URL,
  TIMEOUT: 30000,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border Radius
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Font Sizes
export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
} as const;

// Colors - Light Theme (default export for backwards compatibility)
export const COLORS = {
  // Primary
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  
  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  
  // Text
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  
  // Specific
  income: '#10B981',
  expense: '#EF4444',
  transfer: '#3B82F6',
  
  // Others
  secondary: '#64748B',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
} as const;

export type Currency = typeof APP_CONFIG.DEFAULT_CURRENCY;
export type FileType = typeof APP_CONFIG.ALLOWED_FILE_TYPES[number];
