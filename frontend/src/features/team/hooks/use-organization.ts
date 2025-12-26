import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyOrganization,
  getMyOrganizations,
  switchOrganization,
  updateOrganization,
  getOrganizationMembers,
  inviteMember,
  getPendingInvitations,
  cancelInvitation,
  removeMember,
  updateMemberRole,
  getReceivedInvitations,
  acceptReceivedInvitation,
  rejectReceivedInvitation,
} from '../../../shared/api/organization';

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: getMyOrganization,
    retry: false,
  });
}

export function useMyOrganizations() {
  return useQuery({
    queryKey: ['my-organizations'],
    queryFn: getMyOrganizations,
    retry: false,
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: number) => switchOrganization(organizationId),
    onSuccess: () => {
      // Invalidate all queries to refresh data for new organization
      queryClient.invalidateQueries();
    },
  });
}

export function useReceivedInvitations() {
  return useQuery({
    queryKey: ['received-invitations'],
    queryFn: getReceivedInvitations,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) => acceptReceivedInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] });
    },
  });
}

export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: number) => rejectReceivedInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-invitations'] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, name }: { organizationId: number; name: string }) =>
      updateOrganization(organizationId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useOrganizationMembers(organizationId: number | undefined) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => getOrganizationMembers(organizationId!),
    enabled: !!organizationId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, email, phone, role }: { organizationId: number; email?: string; phone?: string; role?: string }) =>
      inviteMember(organizationId, { email, phone, role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', variables.organizationId] });
    },
  });
}

export function usePendingInvitations(organizationId: number | undefined) {
  return useQuery({
    queryKey: ['pending-invitations', organizationId],
    queryFn: () => getPendingInvitations(organizationId!),
    enabled: !!organizationId,
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, memberId }: { organizationId: number; memberId: number }) =>
      removeMember(organizationId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, memberId, role }: { organizationId: number; memberId: number; role: 'admin' | 'member' }) =>
      updateMemberRole(organizationId, memberId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', variables.organizationId] });
    },
  });
}
