import { APP_CONFIG } from '../constants/config';

export const useCurrency = () => {
  const formatCurrency = (value: number | string): string => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return '0,00 AOA';
    }

    return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
      style: 'currency',
      currency: APP_CONFIG.CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  const formatNumber = (value: number | string): string => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue)) {
      return '0';
    }

    return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const parseCurrency = (value: string): number => {
    // Remove todos os caracteres não numéricos exceto vírgula e ponto
    const cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // Substitui vírgula por ponto para conversão
    const normalizedValue = cleanValue.replace(',', '.');
    
    return parseFloat(normalizedValue) || 0;
  };

  return {
    formatCurrency,
    formatNumber,
    parseCurrency,
  };
};