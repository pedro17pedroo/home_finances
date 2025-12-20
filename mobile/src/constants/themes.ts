// Temas da aplicação
export const lightTheme = {
  // Cores principais
  primary: '#007bff',
  primaryDark: '#0056b3',
  primaryLight: '#66b3ff',
  
  // Cores de fundo
  background: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundTertiary: '#e9ecef',
  
  // Cores de texto
  text: '#212529',
  textSecondary: '#6c757d',
  textTertiary: '#adb5bd',
  
  // Cores de status
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  // Cores de borda
  border: '#dee2e6',
  borderLight: '#e9ecef',
  
  // Cores específicas
  income: '#28a745',
  expense: '#dc3545',
  transfer: '#17a2b8',
  
  // Sombras
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
} as const;

export const darkTheme = {
  // Cores principais
  primary: '#0d6efd',
  primaryDark: '#0a58ca',
  primaryLight: '#6ea8fe',
  
  // Cores de fundo
  background: '#121212',
  backgroundSecondary: '#1e1e1e',
  backgroundTertiary: '#2d2d2d',
  
  // Cores de texto
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  textTertiary: '#808080',
  
  // Cores de status
  success: '#198754',
  warning: '#fd7e14',
  error: '#dc3545',
  info: '#0dcaf0',
  
  // Cores de borda
  border: '#404040',
  borderLight: '#333333',
  
  // Cores específicas
  income: '#198754',
  expense: '#dc3545',
  transfer: '#0dcaf0',
  
  // Sombras
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
} as const;

export type Theme = typeof lightTheme;

// Utilitário para obter o tema baseado no modo
export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};