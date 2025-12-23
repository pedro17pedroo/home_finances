import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Lock, Star } from 'lucide-react';
import { useFeatureGate } from '../../hooks/use-subscription';

interface FeatureGateProps {
  featureKey: string;
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
  showOverlay?: boolean;
}

/**
 * Component that gates content based on plan features.
 * Shows upgrade prompt if user doesn't have access to the feature.
 */
export function FeatureGate({ 
  featureKey, 
  featureName, 
  children, 
  fallback,
  showOverlay = true 
}: FeatureGateProps) {
  const { isAllowed, isLoading, showUpgradePrompt } = useFeatureGate(featureKey);

  if (isLoading) {
    return <>{children}</>;
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showOverlay) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg">
          <div className="text-center p-6 max-w-sm">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Funcionalidade Premium
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              "{featureName}" não está disponível no seu plano atual.
            </p>
            <Link href="/subscription?tab=planos">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Star className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Simple hook-based check for conditional rendering
 */
export function useCanAccess(featureKey: string): boolean {
  const { isAllowed } = useFeatureGate(featureKey);
  return isAllowed;
}

/**
 * Badge component to show when a feature requires upgrade
 */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full ${className}`}>
      <Star className="w-3 h-3 mr-1" />
      Premium
    </span>
  );
}

/**
 * Button that shows upgrade prompt if feature is not available
 */
interface FeatureButtonProps {
  featureKey: string;
  featureName: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FeatureButton({
  featureKey,
  featureName,
  onClick,
  children,
  className = '',
  disabled = false,
}: FeatureButtonProps) {
  const { isAllowed, isLoading } = useFeatureGate(featureKey);

  if (isLoading) {
    return (
      <button className={className} disabled>
        {children}
      </button>
    );
  }

  if (!isAllowed) {
    return (
      <Link href="/subscription?tab=planos">
        <button 
          className={`${className} opacity-75`}
          title={`"${featureName}" requer upgrade do plano`}
        >
          <Lock className="w-4 h-4 mr-1 inline" />
          {children}
        </button>
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
