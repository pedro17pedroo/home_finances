// Configurações da aplicação
export const APP_CONFIG = {
  // API
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:5001/api' 
    : 'https://your-production-api.com/api',
  
  // Cache
  CACHE_TTL_MINUTES: 30,
  CACHE_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
  
  // Performance
  DEBOUNCE_DELAY: 500,
  THROTTLE_DELAY: 1000,
  
  // Offline
  MAX_OFFLINE_RETRIES: 3,
  OFFLINE_QUEUE_SIZE_LIMIT: 100,
  
  // Analytics
  ANALYTICS_ENABLED: !__DEV__, // Desabilitado em desenvolvimento
  
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
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
} as const;

// Tipos derivados das configurações
export type Currency = typeof APP_CONFIG.DEFAULT_CURRENCY;
export type FileType = typeof APP_CONFIG.ALLOWED_FILE_TYPES[number];