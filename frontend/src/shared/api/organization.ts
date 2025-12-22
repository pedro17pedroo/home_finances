import { apiClient } from './client';

export interface Organization {
  id: number;
  name: string;
  ownerId: number;
  planType: string;
  subscriptionStatus: string;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
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
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationDetails {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
}

// Get current user's organization
export async function getMyOrganization(): Promise<Organization> {
  const response = await apiClient.get('/organizations/my');
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

// Invite a new member
export async function inviteMember(organizationId: number, data: { email: string; role?: string }): Promise<TeamInvitation> {
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

// Remove a member
export async function removeMember(organizationId: number, memberId: number): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}/members/${memberId}`);
}

// Update member role
export async function updateMemberRole(organizationId: number, memberId: number, role: 'admin' | 'member'): Promise<OrganizationMember> {
  const response = await apiClient.put(`/organizations/${organizationId}/members/${memberId}/role`, { role });
  return response.data.data;
}
