import { OrganizationRepository } from "../repositories/organization.repository.js";
import { OrganizationMembershipRepository } from "../repositories/organization-membership.repository.js";
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
  email?: string;
  phone?: string;
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
    // Import OrganizationMembershipService
    const { OrganizationMembershipService } = await import("./organization-membership.service.js");
    
    // Verify user is a member of the organization
    const isMember = await OrganizationMembershipService.isMember(userId, organizationId);
    if (!isMember) {
      throw new ForbiddenError("Você não tem acesso a esta organização");
    }

    // Get all memberships for this organization
    const memberships = await OrganizationMembershipService.getOrganizationMembers(organizationId);
    
    // Get user details for each membership
    const membersPromises = memberships.map(async (membership) => {
      const user = await UserRepository.findById(membership.userId);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email || undefined,
        phone: user.phone || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: membership.role || 'member',
        createdAt: membership.joinedAt || user.createdAt || undefined,
      } as OrganizationMember;
    });
    
    const members = await Promise.all(membersPromises);
    
    // Filter out null values and return
    return members.filter((m): m is OrganizationMember => m !== null);
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
    
    // Validate that either email or phone is provided
    if (!data.email && !data.phone) {
      throw new BadRequestError("Email ou telefone é obrigatório");
    }
    
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

    // Check if user is already a member (by email or phone)
    let existingUser = null;
    if (data.email) {
      existingUser = await UserRepository.findByEmail(data.email);
    }
    if (!existingUser && data.phone) {
      existingUser = await UserRepository.findByPhone(data.phone);
    }
    
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new ConflictError("Este utilizador já é membro da organização");
    }

    // Check if there's already a pending invitation (by email or phone)
    let existingInvitation = null;
    if (data.email) {
      existingInvitation = await OrganizationRepository.findInvitationByEmail(data.email, organizationId);
    }
    if (!existingInvitation && data.phone) {
      existingInvitation = await OrganizationRepository.findInvitationByPhone(data.phone, organizationId);
    }
    
    if (existingInvitation) {
      throw new ConflictError("Já existe um convite pendente para este utilizador");
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await OrganizationRepository.createInvitation({
      organizationId,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || 'member',
      invitedBy: inviterId,
      token,
      expiresAt,
    });

    // Send invitation notification
    const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'Um administrador';
    
    if (data.email) {
      // Send email invitation
      emailService.sendTeamInvitationEmail(
        data.email,
        inviterName,
        organization.name,
        token,
        data.role || 'member'
      ).catch(err => {
        console.error('Error sending invitation email:', err);
      });
    }
    
    // TODO: If phone is provided, send SMS invitation
    // For now, the user will see the invitation in the app
    
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
   * Accept an invitation and create user account or add membership for existing user
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4
   * - For existing users: Add membership without creating new user
   * - For new users: Create account, create own organization, add to inviting org
   */
  static async acceptInvitation(data: AcceptInvitationRequest): Promise<{ user: User; organization: Organization; isExistingUser: boolean }> {
    const invitation = await OrganizationRepository.findInvitationByToken(data.token);
    if (!invitation) {
      throw new NotFoundError("Convite inválido ou expirado");
    }

    // Get organization to inherit plan info
    const organization = await this.getOrganization(invitation.organizationId);
    
    // Import OrganizationMembershipService for membership operations
    const { OrganizationMembershipService } = await import("./organization-membership.service.js");

    // Check if email is already registered
    // Requirements: 5.1, 5.2
    const existingUser = await UserRepository.findByEmail(invitation.email!);
    if (existingUser) {
      // Check if user is already a member of this organization
      const existingMembership = await OrganizationMembershipService.isMember(
        existingUser.id, 
        invitation.organizationId
      );
      
      if (existingMembership) {
        throw new ConflictError("Utilizador já é membro desta organização");
      }

      // Add membership to the inviting organization without creating new user
      // Requirements: 5.2 - Add membership without creating new account
      await OrganizationMembershipService.addMember(
        invitation.organizationId,
        existingUser.id,
        invitation.role || 'member',
        invitation.invitedBy
      );

      // Mark invitation as accepted
      await OrganizationRepository.acceptInvitation(invitation.id);

      // Return existing user with the organization they were invited to
      return { user: existingUser, organization, isExistingUser: true };
    }

    // For new users: Validate required fields
    // Requirements: 5.3, 5.4
    if (!data.firstName || !data.lastName || !data.password) {
      throw new BadRequestError("Nome, sobrenome e senha são obrigatórios para novos utilizadores");
    }
    
    // Get organization's subscription status for the new user
    const { db } = await import("../../core/database/db.js");
    const { subscriptions } = await import("../../core/database/schema.js");
    const { desc, eq } = await import("drizzle-orm");
    
    const [orgSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, invitation.organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    
    // Determine subscription status from organization's subscription
    let memberSubscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' = 'active';
    if (orgSubscription) {
      if (orgSubscription.status === 'active') {
        memberSubscriptionStatus = 'active';
      } else if (orgSubscription.status === 'trial') {
        memberSubscriptionStatus = 'trialing';
      } else if (orgSubscription.status === 'expired') {
        memberSubscriptionStatus = 'past_due';
      } else if (orgSubscription.status === 'cancelled') {
        memberSubscriptionStatus = 'canceled';
      }
    } else {
      // Use organization's status if no subscription found
      memberSubscriptionStatus = organization.subscriptionStatus || 'active';
    }

    // Create new user
    const hashedPassword = await hashPassword(data.password);
    
    const newUser = await UserRepository.create({
      email: invitation.email,
      phone: data.phone,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      // Don't set organizationId here - we'll use memberships
      planType: 'basic',
      subscriptionStatus: 'trialing',
    });

    // Create user's own default organization
    // Requirements: 5.4 - Create their own default Organization
    let userOwnOrg: Organization | null = null;
    try {
      const orgName = `${data.firstName} ${data.lastName}`.trim() || 'Minha Organização';
      userOwnOrg = await OrganizationRepository.create({
        name: orgName,
        ownerId: newUser.id,
        planType: 'basic',
        subscriptionStatus: 'trialing',
        maxUsers: 1,
      });

      // Create membership with role 'owner' for user's own organization
      await OrganizationMembershipService.addMember(
        userOwnOrg.id,
        newUser.id,
        'owner'
      );

      // Set activeOrganizationId to user's own organization
      await UserRepository.update(newUser.id, {
        activeOrganizationId: userOwnOrg.id,
        organizationId: userOwnOrg.id,
        role: 'owner',
      });
    } catch (error) {
      console.error('Error creating own organization for invited user:', error);
    }

    // Add membership to the inviting organization
    // Requirements: 5.4 - Add them to the inviting Organization
    await OrganizationMembershipService.addMember(
      invitation.organizationId,
      newUser.id,
      invitation.role || 'member',
      invitation.invitedBy
    );

    // Create default categories for the new user's organization
    try {
      await CategoryService.createDefaultCategories(newUser.id, userOwnOrg?.id || null);
    } catch (error) {
      console.error('Error creating default categories for invited user:', error);
    }

    // Mark invitation as accepted
    await OrganizationRepository.acceptInvitation(invitation.id);

    // Fetch updated user
    const updatedUser = await UserRepository.findById(newUser.id);

    return { user: updatedUser || newUser, organization, isExistingUser: false };
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

  /**
   * Get invitations received by a user (by their email or phone)
   */
  static async getReceivedInvitations(userId: number): Promise<any[]> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    const invitations = await OrganizationRepository.findInvitationsForUser(user.email, user.phone);
    
    // Enrich with organization info
    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const org = await OrganizationRepository.findById(inv.organizationId);
        const inviter = inv.invitedBy ? await UserRepository.findById(inv.invitedBy) : null;
        return {
          ...inv,
          organizationName: org?.name || 'Organização',
          inviterName: inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() : 'Desconhecido',
        };
      })
    );

    return enrichedInvitations;
  }

  /**
   * Accept an invitation by ID (for logged-in users)
   */
  static async acceptInvitationById(invitationId: number, userId: number): Promise<any> {
    const invitation = await OrganizationRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError("Convite não encontrado");
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      throw new BadRequestError("Este convite expirou");
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      throw new BadRequestError("Este convite já foi aceite");
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Verify the invitation is for this user (by email or phone)
    const isForUser = 
      (invitation.email && user.email && invitation.email.toLowerCase() === user.email.toLowerCase()) ||
      (invitation.phone && user.phone && invitation.phone === user.phone);

    if (!isForUser) {
      throw new ForbiddenError("Este convite não é para você");
    }

    // Check if user is already a member
    const existingMembership = await OrganizationMembershipRepository.findByUserAndOrg(userId, invitation.organizationId);
    if (existingMembership) {
      throw new ConflictError("Você já é membro desta organização");
    }

    // Create membership
    const membership = await OrganizationMembershipRepository.create({
      userId,
      organizationId: invitation.organizationId,
      role: invitation.role || 'member',
      invitedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await OrganizationRepository.acceptInvitation(invitationId);

    // Get organization info
    const organization = await OrganizationRepository.findById(invitation.organizationId);

    return {
      membership,
      organization,
    };
  }

  /**
   * Reject an invitation
   */
  static async rejectInvitation(invitationId: number, userId: number): Promise<void> {
    const invitation = await OrganizationRepository.findInvitationById(invitationId);
    if (!invitation) {
      throw new NotFoundError("Convite não encontrado");
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Verify the invitation is for this user
    const isForUser = 
      (invitation.email && user.email && invitation.email.toLowerCase() === user.email.toLowerCase()) ||
      (invitation.phone && user.phone && invitation.phone === user.phone);

    if (!isForUser) {
      throw new ForbiddenError("Este convite não é para você");
    }

    // Delete the invitation
    await OrganizationRepository.deleteInvitation(invitationId);
  }
}
