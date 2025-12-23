import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import type { Organization } from '../types';
import { apiClient } from '../api/client';

interface OrganizationContextType {
  organization: Organization | null;
  membersCount: number;
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membersCount, setMembersCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrganization = async () => {
    if (!isAuthenticated || !user?.organizationId) {
      setOrganization(null);
      setMembersCount(1);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get('/organizations/my');
      if (response.data?.status === 'success' && response.data?.data) {
        setOrganization(response.data.data);
        
        // Fetch members count
        try {
          const membersResponse = await apiClient.get(`/organizations/${response.data.data.id}/members`);
          if (membersResponse.data?.status === 'success' && membersResponse.data?.data) {
            setMembersCount(membersResponse.data.data.length);
          }
        } catch (err) {
          setMembersCount(1); // Default to 1 (owner)
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      // If the endpoint doesn't exist yet, create a mock organization from user data
      if (user) {
        setOrganization({
          id: user.organizationId || 0,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Minha Organização',
          ownerId: user.id,
          planType: user.planType,
          subscriptionStatus: user.subscriptionStatus,
          maxUsers: 1,
        });
        setMembersCount(1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [isAuthenticated, user?.organizationId]);

  const isOwner = user?.role === 'owner' || (organization?.ownerId === user?.id);
  const isAdmin = isOwner || user?.role === 'admin';
  const canManageMembers = isAdmin && (organization?.maxUsers || 1) > 1;

  const value: OrganizationContextType = {
    organization,
    membersCount,
    isLoading,
    isOwner,
    isAdmin,
    canManageMembers,
    refreshOrganization: fetchOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
