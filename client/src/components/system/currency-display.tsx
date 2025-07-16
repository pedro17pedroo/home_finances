import { useSystemSetting } from '@/lib/system-config';
import { formatCurrency } from '@/lib/utils';

interface CurrencyDisplayProps {
  value: string | number;
  className?: string;
}

export function CurrencyDisplay({ value, className }: CurrencyDisplayProps) {
  const defaultCurrency = useSystemSetting('default_currency', 'AOA');
  const defaultLocale = useSystemSetting('default_locale', 'pt-AO');
  
  return (
    <span className={className}>
      {formatCurrency(value, defaultCurrency, defaultLocale)}
    </span>
  );
}

export function CurrencySymbol({ className }: { className?: string }) {
  const currencySymbol = useSystemSetting('currency_symbol', 'Kz');
  
  return <span className={className}>{currencySymbol}</span>;
}