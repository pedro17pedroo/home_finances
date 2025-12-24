import { SPACING, RADIUS, FONT_SIZE } from './config';

// Light Theme Colors
export const lightColors = {
  // Primary
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryBackground: '#EFF6FF',
  
  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceTertiary: '#E2E8F0',
  
  // Text
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Status
  success: '#10B981',
  successBackground: '#D1FAE5',
  warning: '#F59E0B',
  warningBackground: '#FEF3C7',
  error: '#EF4444',
  errorBackground: '#FEE2E2',
  info: '#3B82F6',
  infoBackground: '#DBEAFE',
  
  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocused: '#3B82F6',
  
  // Specific
  income: '#10B981',
  incomeBackground: '#D1FAE5',
  expense: '#EF4444',
  expenseBackground: '#FEE2E2',
  transfer: '#3B82F6',
  transferBackground: '#DBEAFE',
  
  // Card
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  
  // Input
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputPlaceholder: '#94A3B8',
  
  // Tab Bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',
  
  // Others
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
} as const;

// Dark Theme Colors
export const darkColors = {
  // Primary
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  primaryBackground: '#1E3A5F',
  
  // Background
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  surfaceTertiary: '#475569',
  
  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#1E293B',
  
  // Status
  success: '#34D399',
  successBackground: '#064E3B',
  warning: '#FBBF24',
  warningBackground: '#78350F',
  error: '#F87171',
  errorBackground: '#7F1D1D',
  info: '#60A5FA',
  infoBackground: '#1E3A5F',
  
  // Border
  border: '#334155',
  borderLight: '#475569',
  borderFocused: '#3B82F6',
  
  // Specific
  income: '#34D399',
  incomeBackground: '#064E3B',
  expense: '#F87171',
  expenseBackground: '#7F1D1D',
  transfer: '#60A5FA',
  transferBackground: '#1E3A5F',
  
  // Card
  card: '#1E293B',
  cardBorder: '#334155',
  
  // Input
  inputBackground: '#1E293B',
  inputBorder: '#334155',
  inputPlaceholder: '#64748B',
  
  // Tab Bar
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
  tabActive: '#3B82F6',
  tabInactive: '#64748B',
  
  // Others
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  skeleton: '#334155',
  skeletonHighlight: '#475569',
} as const;

export type ThemeColors = typeof lightColors;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  fontSize: typeof FONT_SIZE;
}

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  spacing: SPACING,
  radius: RADIUS,
  fontSize: FONT_SIZE,
};

export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  spacing: SPACING,
  radius: RADIUS,
  fontSize: FONT_SIZE,
};

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
