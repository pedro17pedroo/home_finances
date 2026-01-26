import { apiClient } from './client';

export interface Organization {
  id: number;
  name: string;
  ownerId: number;
  role?: string; // User's role in this organization
  planType: string;
  subscriptionStatus: string;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: number;
  organizationId: number;
  organizationName: string;
  role: string;
  planType: string | null;
  subscriptionStatus: string | null;
  joinedAt: string | null;
  isActive: boolean;
}

export interface OrganizationMember {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: string;
}

export interface TeamInvitation {
  id: number;
  organizationId: number;
  email?: string;
  phone?: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ReceivedInvitation {
  id: number;
  organizationId: number;
  organizationName: string;
  role: string;
  invitedByName: string;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationDetails {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
}

// Get current user's active organization
export async function getMyOrganization(): Promise<Organization> {
  const response = await apiClient.get('/organizations/my');
  const organizations = response.data.data?.organizations || [];
  
  // Find the active organization or return the first one
  const activeOrg = organizations.find((org: any) => org.isActive) || organizations[0];
  
  if (!activeOrg) {
    throw new Error('Nenhuma organização encontrada');
  }
  
  // Map to Organization interface
  return {
    id: activeOrg.id,
    name: activeOrg.name,
    ownerId: activeOrg.ownerId,
    role: activeOrg.role, // User's role in this organization
    planType: activeOrg.subscription?.planType || 'basic',
    subscriptionStatus: activeOrg.subscription?.status || 'trialing',
    maxUsers: activeOrg.maxUsers || 1,
    createdAt: activeOrg.createdAt || new Date().toISOString(),
    updatedAt: activeOrg.updatedAt || new Date().toISOString(),
  };
}

// Get all user's organizations (memberships)
export async function getMyOrganizations(): Promise<OrganizationMembership[]> {
  const response = await apiClient.get('/organizations/my');
  const organizations = response.data.data?.organizations || [];
  
  // Map backend response to frontend interface
  return organizations.map((org: any) => ({
    id: org.id,
    organizationId: org.id,
    organizationName: org.name,
    role: org.role,
    planType: org.subscription?.planType || null,
    subscriptionStatus: org.subscription?.status || null,
    joinedAt: null,
    isActive: org.isActive,
  }));
}

// Switch active organization
export async function switchOrganization(organizationId: number): Promise<{ user: any; activeOrganization: any }> {
  const response = await apiClient.post('/organizations/switch', { organizationId });
  return response.data.data;
}

// Update organization
export async function updateOrganization(organizationId: number, data: { name: string }): Promise<Organization> {
  const response = await apiClient.put(`/organizations/${organizationId}`, data);
  return response.data.data;
}

// Get organization members
export async function getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]> {
  const response = await apiClient.get(`/organizations/${organizationId}/members`);
  return response.data.data;
}

// Invite a new member (by email or phone)
export async function inviteMember(organizationId: number, data: { email?: string; phone?: string; role?: string }): Promise<TeamInvitation> {
  const response = await apiClient.post(`/organizations/${organizationId}/invitations`, data);
  return response.data.data;
}

// Get pending invitations
export async function getPendingInvitations(organizationId: number): Promise<TeamInvitation[]> {
  const response = await apiClient.get(`/organizations/${organizationId}/invitations`);
  return response.data.data;
}

// Cancel an invitation
export async function cancelInvitation(invitationId: number): Promise<void> {
  await apiClient.delete(`/organizations/invitations/${invitationId}`);
}

// Get invitation details by token (public)
export async function getInvitationByToken(token: string): Promise<InvitationDetails> {
  const response = await apiClient.get(`/organizations/invitations/token/${token}`);
  return response.data.data;
}

// Accept invitation (public)
export async function acceptInvitation(data: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}): Promise<{ user: any; organization: Organization }> {
  const response = await apiClient.post('/organizations/invitations/accept', data);
  return response.data.data;
}

// Get received invitations for current user
export async function getReceivedInvitations(): Promise<ReceivedInvitation[]> {
  const response = await apiClient.get('/organizations/my-invitations');
  return response.data.data || [];
}

// Accept a received invitation
export async function acceptReceivedInvitation(invitationId: number): Promise<void> {
  await apiClient.post(`/organizations/invitations/${invitationId}/accept`);
}

// Reject a received invitation
export async function rejectReceivedInvitation(invitationId: number): Promise<void> {
  await apiClient.post(`/organizations/invitations/${invitationId}/reject`);
}

// Remove a member
export async function removeMember(organizationId: number, memberId: number): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}/members/${memberId}`);
}

// Update member role
export async function updateMemberRole(organizationId: number, memberId: number, role: 'admin' | 'member'): Promise<OrganizationMember> {
  const response = await apiClient.put(`/organizations/${organizationId}/members/${memberId}/role`, { role });
  return response.data.data;
}
