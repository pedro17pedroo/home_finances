import { useCallback } from 'react';

export const useCurrency = () => {
  const formatCurrency = useCallback((value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0,00 Kz';
    
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz';
  }, []);

  const parseCurrency = useCallback((value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }, []);

  return { formatCurrency, parseCurrency };
};
