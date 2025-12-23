import { OrganizationRepository } from "../repositories/organization.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { CategoryService } from "./category.service.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError,
  ConflictError
} from "../../core/errors/app-error.js";
import { hashPassword } from "../../api/middlewares/auth.js";
import emailService from "../../infrastructure/email/email.service.js";
import crypto from "crypto";
import type { Organization, TeamInvitation, User, InsertOrganization } from "../../core/database/schema.js";

export interface CreateOrganizationRequest {
  name: string;
  ownerId: number;
}

export interface InviteMemberRequest {
  email: string;
  role?: 'admin' | 'member';
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

export interface OrganizationMember {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: Date;
}

export class OrganizationService {
  /**
   * Create a new organization for a user (called during registration)
   */
  static async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    // Check if user already has an organization
    const existingOrg = await OrganizationRepository.findByOwnerId(data.ownerId);
    if (existingOrg) {
      return existingOrg; // Return existing organization
    }

    const orgData: InsertOrganization = {
      name: data.name,
      ownerId: data.ownerId,
      planType: 'basic',
      subscriptionStatus: 'trialing',
      maxUsers: 1, // Default, can be increased with plan upgrade
    };

    const organization = await OrganizationRepository.create(orgData);

    // Update user with organization ID and set as owner
    await UserRepository.update(data.ownerId, {
      organizationId: organization.id,
      role: 'owner',
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(id: number): Promise<Organization> {
    const organization = await OrganizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundError("Organização");
    }
    return organization;
  }

  /**
   * Get organization for a user
   */
  static async getUserOrganization(userId: number): Promise<Organization | null> {
    const user = await UserRepository.findById(userId);
    if (!user || !user.organizationId) {
      return null;
    }
    return OrganizationRepository.findById(user.organizationId);
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: number, 
    userId: number, 
    data: { name?: string }
  ): Promise<Organization> {
    const organization = await this.getOrganization(organizationId);
    
    // Only owner can update organization
    if (organization.ownerId !== userId) {
      throw new ForbiddenError("Apenas o proprietário pode atualizar a organização");
    }

    return OrganizationRepository.update(organizationId, data);
  }

  /**
   * Get organization members
   */
  static async getMembers(organizationId: number, userId: number): Promise<OrganizationMember[]> {
    // Verify user belongs to organization
    const user = await UserRepository.findById(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new ForbiddenError("Você não tem acesso a esta organização");
    }

    const members = await OrganizationRepository.getMembers(organizationId);
    
    return members.map(member => ({
      id: member.id,
      email: member.email || undefined,
      phone: member.phone || undefined,
      firstName: member.firstName || undefined,
      lastName: member.lastName || undefined,
      role: member.role || 'member',
      createdAt: member.createdAt || undefined,
    }));
  }

  /**
   * Invite a new member to the organization
   */
  static async inviteMember(
    organizationId: number, 
    inviterId: number, 
    data: InviteMemberRequest
  ): Promise<TeamInvitation> {
    const organization = await this.getOrganization(organizationId);
    
    // Check if inviter is owner (only owner can invite)
    const inviter = await UserRepository.findById(inviterId);
    if (!inviter || inviter.organizationId !== organizationId) {
      throw new ForbiddenError("Você não tem acesso a esta organização");
    }
    
    if (inviter.role !== 'owner') {
      throw new ForbiddenError("Apenas o proprietário pode convidar membros");
    }

    // Check member limit using plan access service
    const { PlanAccessService } = await import('./plan-access.service.js');
    const limits = await PlanAccessService.getOrganizationPlanLimits(organizationId);
    
    const currentMembers = await OrganizationRepository.getMembers(organizationId);
    const pendingInvitations = await OrganizationRepository.findPendingInvitations(organizationId);
    const totalUsersAndInvites = currentMembers.length + pendingInvitations.length;
    const maxUsers = (limits as any).maxUsers || organization.maxUsers || 1;
    
    // -1 means unlimited
    if (maxUsers !== -1 && totalUsersAndInvites >= maxUsers) {
      throw new BadRequestError(`Limite de membros atingido (${totalUsersAndInvites}/${maxUsers}). Faça upgrade do plano para adicionar mais membros.`);
    }

    // Check if email is already a member
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new ConflictError("Este email já é membro da organização");
    }

    // Check if there's already a pending invitation
    const existingInvitation = await OrganizationRepository.findInvitationByEmail(data.email, organizationId);
    if (existingInvitation) {
      throw new ConflictError("Já existe um convite pendente para este email");
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await OrganizationRepository.createInvitation({
      organizationId,
      email: data.email,
      role: data.role || 'member',
      invitedBy: inviterId,
      token,
      expiresAt,
    });

    // Send invitation email
    const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'Um administrador';
    emailService.sendTeamInvitationEmail(
      data.email,
      inviterName,
      organization.name,
      token,
      data.role || 'member'
    ).catch(err => {
      console.error('Error sending invitation email:', err);
    });

    return invitation;
  }

  /**
   * Get pending invitations for an organization
   */
  static async getPendingInvitations(organizationId: number, userId: number): Promise<TeamInvitation[]> {
    // Verify user belongs to organization and is owner
    const user = await UserRepository.findById(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new ForbiddenError("Você não tem acesso a esta organização");
    }

    if (user.role !== 'owner') {
      throw new ForbiddenError("Apenas o proprietário pode ver convites");
    }

    return OrganizationRepository.findPendingInvitations(organizationId);
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(invitationId: number, userId: number): Promise<void> {
    const invitation = await OrganizationRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError("Convite");
    }

    // Verify user is owner of the organization
    const user = await UserRepository.findById(userId);
    if (!user || user.organizationId !== invitation.organizationId) {
      throw new ForbiddenError("Você não tem acesso a este convite");
    }

    if (user.role !== 'owner') {
      throw new ForbiddenError("Apenas o proprietário pode cancelar convites");
    }

    await OrganizationRepository.deleteInvitation(invitationId);
  }

  /**
   * Accept an invitation and create user account
   */
  static async acceptInvitation(data: AcceptInvitationRequest): Promise<{ user: User; organization: Organization }> {
    const invitation = await OrganizationRepository.findInvitationByToken(data.token);
    if (!invitation) {
      throw new NotFoundError("Convite inválido ou expirado");
    }

    // Check if email is already registered
    const existingUser = await UserRepository.findByEmail(invitation.email);
    if (existingUser) {
      // If user exists, just add them to the organization
      if (existingUser.organizationId) {
        throw new ConflictError("Este email já está associado a outra organização");
      }

      await UserRepository.update(existingUser.id, {
        organizationId: invitation.organizationId,
        role: invitation.role || 'member',
      });

      await OrganizationRepository.acceptInvitation(invitation.id);

      const organization = await this.getOrganization(invitation.organizationId);
      return { user: existingUser, organization };
    }

    // Create new user
    const hashedPassword = await hashPassword(data.password);
    
    const newUser = await UserRepository.create({
      email: invitation.email,
      phone: data.phone,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationId: invitation.organizationId,
      role: invitation.role || 'member',
      planType: 'basic',
      subscriptionStatus: 'active', // Members inherit org subscription
    });

    // Create default categories for the new user
    try {
      await CategoryService.createDefaultCategoriesForUser(newUser.id);
    } catch (error) {
      console.error('Error creating default categories for invited user:', error);
    }

    await OrganizationRepository.acceptInvitation(invitation.id);

    const organization = await this.getOrganization(invitation.organizationId);
    return { user: newUser, organization };
  }

  /**
   * Remove a member from the organization
   */
  static async removeMember(organizationId: number, memberId: number, requesterId: number): Promise<void> {
    const organization = await this.getOrganization(organizationId);
    
    // Can't remove the owner
    if (memberId === organization.ownerId) {
      throw new BadRequestError("Não é possível remover o proprietário da organização");
    }

    // Verify requester is owner (only owner can remove members)
    const requester = await UserRepository.findById(requesterId);
    if (!requester || requester.organizationId !== organizationId) {
      throw new ForbiddenError("Você não tem acesso a esta organização");
    }

    if (requester.role !== 'owner') {
      throw new ForbiddenError("Apenas o proprietário pode remover membros");
    }

    // Verify member exists in organization
    const member = await UserRepository.findById(memberId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError("Membro");
    }

    // Remove member from organization
    await UserRepository.update(memberId, {
      organizationId: null,
      role: 'member',
    });
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    organizationId: number, 
    memberId: number, 
    newRole: 'admin' | 'member',
    requesterId: number
  ): Promise<User> {
    const organization = await this.getOrganization(organizationId);
    
    // Only owner can change roles
    if (organization.ownerId !== requesterId) {
      throw new ForbiddenError("Apenas o proprietário pode alterar funções");
    }

    // Can't change owner's role
    if (memberId === organization.ownerId) {
      throw new BadRequestError("Não é possível alterar a função do proprietário");
    }

    const member = await UserRepository.findById(memberId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundError("Membro");
    }

    return UserRepository.update(memberId, { role: newRole });
  }

  /**
   * Get invitation details by token (for accept invitation page)
   */
  static async getInvitationByToken(token: string): Promise<{ invitation: TeamInvitation; organization: Organization }> {
    const invitation = await OrganizationRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError("Convite inválido ou expirado");
    }

    const organization = await this.getOrganization(invitation.organizationId);
    return { invitation, organization };
  }
}
