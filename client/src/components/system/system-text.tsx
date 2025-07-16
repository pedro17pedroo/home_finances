import { useSystemSetting } from '@/lib/system-config';

interface SystemTextProps {
  configKey: string;
  fallback: string;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
}

export function SystemText({ 
  configKey, 
  fallback, 
  className, 
  as: Component = 'span' 
}: SystemTextProps) {
  const text = useSystemSetting(configKey, fallback);
  
  return <Component className={className}>{text}</Component>;
}

// Specific components for common use cases
export function SystemHeroTitle({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="landing_hero_title"
      fallback="Controle Financeiro Inteligente"
      className={className}
      as="h1"
    />
  );
}

export function SystemHeroSubtitle({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="landing_hero_subtitle"
      fallback="Gerencie suas finanças pessoais com facilidade e segurança"
      className={className}
      as="p"
    />
  );
}

export function SystemCtaText({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="landing_cta_text"
      fallback="Comece seu teste gratuito"
      className={className}
    />
  );
}

export function SystemCompanyName({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="company_name"
      fallback="Sistema de Controle Financeiro"
      className={className}
    />
  );
}

export function SystemSupportEmail({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="support_email"
      fallback="suporte@financecontrol.com"
      className={className}
    />
  );
}

export function SystemSupportPhone({ className }: { className?: string }) {
  return (
    <SystemText
      configKey="support_phone"
      fallback="+244 900 000 000"
      className={className}
    />
  );
}

// Hook for getting trial duration
export function useTrialDuration() {
  return useSystemSetting('trial_duration_days', 14);
}