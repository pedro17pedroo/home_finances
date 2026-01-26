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
    if (!isAuthenticated) {
      setOrganization(null);
      setMembersCount(1);
      return;
    }

    setIsLoading(true);
    try {
      // Use activeOrganization from user if available
      if (user?.activeOrganization) {
        const activeOrg = user.activeOrganization;
        setOrganization({
          id: activeOrg.id,
          name: activeOrg.name,
          ownerId: user.role === 'owner' ? user.id : 0,
          planType: activeOrg.planType || user.planType || 'basic',
          subscriptionStatus: activeOrg.subscriptionStatus || user.subscriptionStatus || 'trialing',
          maxUsers: 10,
        });

        // Fetch members count
        if (activeOrg.id) {
          try {
            const membersResponse = await apiClient.get(`/organizations/${activeOrg.id}/members`);
            if (membersResponse.data?.status === 'success' && membersResponse.data?.data) {
              setMembersCount(membersResponse.data.data.length);
            }
          } catch (err) {
            setMembersCount(1);
          }
        }
      } else if (user?.organizationId) {
        // Fallback: fetch from /organizations/my
        const response = await apiClient.get('/organizations/my');
        if (response.data?.status === 'success' && response.data?.data) {
          const orgs = response.data.data.organizations || [];
          const activeOrg = orgs.find((o: any) => o.isActive) || orgs[0];
          
          if (activeOrg) {
            setOrganization({
              id: activeOrg.id,
              name: activeOrg.name,
              ownerId: user.role === 'owner' ? user.id : 0,
              planType: activeOrg.subscription?.planType || user.planType || 'basic',
              subscriptionStatus: activeOrg.subscription?.status || user.subscriptionStatus || 'trialing',
              maxUsers: 10,
            });

            // Fetch members count
            if (activeOrg.id) {
              try {
                const membersResponse = await apiClient.get(`/organizations/${activeOrg.id}/members`);
                if (membersResponse.data?.status === 'success' && membersResponse.data?.data) {
                  setMembersCount(membersResponse.data.data.length);
                }
              } catch (err) {
                setMembersCount(1);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      // Fallback: create from user data
      if (user) {
        setOrganization({
          id: user.organizationId || 0,
          name: user.activeOrganization?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Minha Organização',
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
  }, [isAuthenticated, user?.organizationId, user?.activeOrganization?.id]);

  // Use role from organization if available, otherwise fallback to user role
  const userRoleInOrg = organization?.role || user?.role;
  const isOwner = userRoleInOrg === 'owner' || (organization?.ownerId === user?.id);
  const isAdmin = isOwner || userRoleInOrg === 'admin';
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
