import { useState } from 'react';
import { Building2, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { useMyOrganizations, useSwitchOrganization } from '../../features/team/hooks/use-organization';
import { showSuccessToast, showErrorToast } from '../lib/alerts';

interface OrganizationSelectorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function OrganizationSelector({ variant = 'compact', className = '' }: OrganizationSelectorProps) {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: organizations, isLoading: orgsLoading } = useMyOrganizations();
  const switchMutation = useSwitchOrganization();

  const activeOrganization = user?.activeOrganization;

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Admin';
      case 'member': return 'Membro';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleSwitch = async (organizationId: number) => {
    if (organizationId === activeOrganization?.id) {
      setIsOpen(false);
      return;
    }

    const targetOrg = organizations?.find(m => m.organizationId === organizationId);

    try {
      await switchMutation.mutateAsync(organizationId);
      await refreshUser();
      setIsOpen(false);
      showSuccessToast(`Organização alterada para ${targetOrg?.organizationName || 'nova organização'}`);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao trocar de organização');
    }
  };

  if (orgsLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return null;
  }

  // Compact variant - button with dropdown
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors max-w-[200px]"
        >
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {activeOrganization?.name || 'Selecionar'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Minhas Organizações
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {organizations.map((org) => {
                  const isActive = org.organizationId === activeOrganization?.id;
                  const isSwitching = switchMutation.isPending && switchMutation.variables === org.organizationId;

                  return (
                    <button
                      key={org.organizationId}
                      onClick={() => handleSwitch(org.organizationId)}
                      disabled={switchMutation.isPending}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Building2 className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {org.organizationName}
                        </p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(org.role)}`}>
                          {getRoleLabel(org.role)}
                        </span>
                      </div>
                      {isSwitching ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : isActive ? (
                        <Check className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full variant - card style
  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs text-gray-500 dark:text-gray-400">Organização Ativa</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {activeOrganization?.name || 'Nenhuma selecionada'}
            </p>
            {activeOrganization && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(activeOrganization.role || 'member')}`}>
                  {getRoleLabel(activeOrganization.role || 'member')}
                </span>
              </div>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Minhas Organizações
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                disabled={switchMutation.isPending}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {organizations.map((org) => {
                const isActive = org.organizationId === activeOrganization?.id;
                const isSwitching = switchMutation.isPending && switchMutation.variables === org.organizationId;

                return (
                  <button
                    key={org.organizationId}
                    onClick={() => handleSwitch(org.organizationId)}
                    disabled={switchMutation.isPending}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Building2 className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {org.organizationName}
                      </p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeColor(org.role)}`}>
                        {getRoleLabel(org.role)}
                      </span>
                    </div>
                    {isSwitching ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    ) : isActive ? (
                      <Check className="w-5 h-5 text-blue-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {switchMutation.isPending && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Trocando organização...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
