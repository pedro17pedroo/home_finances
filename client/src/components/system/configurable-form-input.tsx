import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSystemSetting } from '@/lib/system-config';
import { CurrencySymbol } from './currency-display';

interface ConfigurableCurrencyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

export function ConfigurableCurrencyInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className,
  error
}: ConfigurableCurrencyInputProps) {
  const currencySymbol = useSystemSetting('currency_symbol', 'Kz');
  
  return (
    <div className={className}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={label.toLowerCase().replace(/\s+/g, '-')}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `0.00`}
          className={`pr-12 ${error ? 'border-red-300' : ''}`}
          required={required}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          <CurrencySymbol />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

interface ConfigurablePasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function ConfigurablePasswordInput({
  label,
  value,
  onChange,
  placeholder,
  className,
  error
}: ConfigurablePasswordInputProps) {
  const minLength = useSystemSetting('password_min_length', 8);
  
  return (
    <div className={className}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label} <span className="text-red-500">*</span>
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, '-')}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-red-300' : ''}
        minLength={minLength}
        required
      />
      <p className="text-xs text-gray-500 mt-1">
        Mínimo de {minLength} caracteres
      </p>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

// Hook for form validation with system settings
export function useSystemFormValidation() {
  const minPasswordLength = useSystemSetting('password_min_length', 8);
  const maxLoginAttempts = useSystemSetting('max_login_attempts', 5);
  
  const validatePassword = (password: string): string | null => {
    if (password.length < minPasswordLength) {
      return `A senha deve ter pelo menos ${minPasswordLength} caracteres`;
    }
    return null;
  };
  
  const validateAmount = (amount: string): string | null => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'O valor deve ser maior que zero';
    }
    return null;
  };
  
  return {
    validatePassword,
    validateAmount,
    minPasswordLength,
    maxLoginAttempts
  };
}