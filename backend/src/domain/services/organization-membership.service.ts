import { OrganizationMembershipRepository, MembershipWithDetails } from "../repositories/organization-membership.repository.js";
import { OrganizationRepository } from "../repositories/organization.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError,
  ConflictError
} from "../../core/errors/app-error.js";
import type { OrganizationMembership, InsertOrganizationMembership } from "../../core/database/schema.js";

export interface MembershipInfo {
  id: number;
  organizationId: number;
  organizationName: string;
  role: string;
  planType: string | null;
  subscriptionStatus: string | null;
  joinedAt: Date | null;
  isActive: boolean;
}

export class OrganizationMembershipService {
  /**
   * Get all memberships for a user with organization details
   * Requirements: 1.1, 1.4
   */
  static async getUserMemberships(userId: number): Promise<MembershipInfo[]> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    const memberships = await OrganizationMembershipRepository.findByUserId(userId);
    
    return memberships.map(m => ({
      id: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization?.name || '',
      role: m.role,
      planType: m.organization?.planType || null,
      subscriptionStatus: m.organization?.subscriptionStatus || null,
      joinedAt: m.joinedAt,
      isActive: user.activeOrganizationId === m.organizationId,
    }));
  }

  /**
   * Add a user as a member of an organization
   * Requirements: 1.1, 1.3, 2.1
   */
  static async addMember(
    organizationId: number, 
    userId: number, 
    role: string = 'member',
    invitedBy?: number
  ): Promise<OrganizationMembership> {
    // Verify organization exists
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Check if membership already exists
    const existingMembership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    if (existingMembership) {
      throw new ConflictError("Utilizador já é membro desta organização");
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Papel inválido. Deve ser um de: ${validRoles.join(', ')}`);
    }

    // Create membership
    const membershipData: InsertOrganizationMembership = {
      userId,
      organizationId,
      role,
      joinedAt: new Date(),
      invitedBy: invitedBy || null,
    };

    return OrganizationMembershipRepository.create(membershipData);
  }

  /**
   * Remove a user from an organization
   * Requirements: 1.5
   */
  static async removeMember(organizationId: number, userId: number): Promise<void> {
    // Verify organization exists
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    // Check if membership exists
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new NotFoundError("Membro não encontrado nesta organização");
    }

    // Cannot remove owner
    if (membership.role === 'owner') {
      throw new BadRequestError("Não é possível remover o proprietário da organização");
    }

    // Delete membership
    await OrganizationMembershipRepository.deleteByUserAndOrg(userId, organizationId);

    // If this was the user's active organization, switch to another
    const user = await UserRepository.findById(userId);
    if (user && user.activeOrganizationId === organizationId) {
      const remainingMemberships = await OrganizationMembershipRepository.findByUserId(userId);
      if (remainingMemberships.length > 0) {
        await UserRepository.update(userId, {
          activeOrganizationId: remainingMemberships[0].organizationId,
        });
      } else {
        await UserRepository.update(userId, {
          activeOrganizationId: null,
        });
      }
    }
  }

  /**
   * Check if a user is a member of an organization
   * Requirements: 1.1
   */
  static async isMember(userId: number, organizationId: number): Promise<boolean> {
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    return membership !== null;
  }

  /**
   * Get a user's role in an organization
   * Requirements: 1.4
   */
  static async getRole(userId: number, organizationId: number): Promise<string | null> {
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    return membership?.role || null;
  }

  /**
   * Update a user's role in an organization
   */
  static async updateRole(
    organizationId: number, 
    userId: number, 
    newRole: string,
    requesterId: number
  ): Promise<OrganizationMembership> {
    // Verify organization exists
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    // Verify requester is owner
    const requesterRole = await this.getRole(requesterId, organizationId);
    if (requesterRole !== 'owner') {
      throw new ForbiddenError("Apenas o proprietário pode alterar funções");
    }

    // Check if membership exists
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new NotFoundError("Membro não encontrado nesta organização");
    }

    // Cannot change owner's role
    if (membership.role === 'owner') {
      throw new BadRequestError("Não é possível alterar a função do proprietário");
    }

    // Validate role
    const validRoles = ['admin', 'member'];
    if (!validRoles.includes(newRole)) {
      throw new BadRequestError(`Papel inválido. Deve ser um de: ${validRoles.join(', ')}`);
    }

    return OrganizationMembershipRepository.update(membership.id, { role: newRole });
  }

  /**
   * Get all members of an organization
   */
  static async getOrganizationMembers(organizationId: number): Promise<MembershipWithDetails[]> {
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    return OrganizationMembershipRepository.findByOrganizationId(organizationId);
  }

  /**
   * Count members in an organization
   */
  static async getMemberCount(organizationId: number): Promise<number> {
    return OrganizationMembershipRepository.countByOrganizationId(organizationId);
  }

  /**
   * Get membership details
   */
  static async getMembership(userId: number, organizationId: number): Promise<OrganizationMembership | null> {
    return OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
  }

  /**
   * Switch user's active organization
   * Requirements: 3.1, 3.2, 3.3
   * 
   * Verifies user is member of target organization, updates activeOrganizationId,
   * and returns updated user with new active organization details.
   */
  static async switchOrganization(
    userId: number, 
    organizationId: number
  ): Promise<{
    user: {
      id: number;
      activeOrganizationId: number;
    };
    activeOrganization: MembershipInfo;
  }> {
    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Verify organization exists
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    // Verify user is member of target organization
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new ForbiddenError("Não é membro desta organização");
    }

    // Update user's activeOrganizationId
    const updatedUser = await UserRepository.update(userId, {
      activeOrganizationId: organizationId,
    });

    // Return updated user with active organization details
    return {
      user: {
        id: updatedUser.id,
        activeOrganizationId: organizationId,
      },
      activeOrganization: {
        id: membership.id,
        organizationId: organization.id,
        organizationName: organization.name,
        role: membership.role,
        planType: organization.planType,
        subscriptionStatus: organization.subscriptionStatus,
        joinedAt: membership.joinedAt,
        isActive: true,
      },
    };
  }

  /**
   * Create a new organization with the user as owner
   * Requirements: 2.1, 2.2, 2.3, 2.4
   * 
   * Any user can create a new organization. The creating user becomes the owner.
   * Existing memberships are preserved.
   */
  static async createOrganizationWithOwner(
    userId: number,
    name: string,
    planId?: number
  ): Promise<{
    organization: {
      id: number;
      name: string;
      planType: string | null;
      subscriptionStatus: string | null;
    };
    membership: {
      id: number;
      role: string;
    };
  }> {
    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Create the organization
    const organization = await OrganizationRepository.create({
      name,
      ownerId: userId,
      planType: planId ? 'basic' : 'basic', // Default to basic, can be upgraded later
      subscriptionStatus: 'trialing',
      maxUsers: 1, // Default, can be increased with plan upgrade
    });

    // Create membership with role 'owner'
    const membership = await OrganizationMembershipRepository.create({
      userId,
      organizationId: organization.id,
      role: 'owner',
      joinedAt: new Date(),
      invitedBy: null,
    });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        planType: organization.planType,
        subscriptionStatus: organization.subscriptionStatus,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
    };
  }

  /**
   * Leave an organization (for non-owners)
   * Requirements: 1.5, 7.5
   * 
   * Verifies user is not owner, removes membership, and switches to another org if leaving active.
   */
  static async leaveOrganization(userId: number, organizationId: number): Promise<void> {
    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Utilizador");
    }

    // Verify organization exists
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundError("Organização");
    }

    // Check if membership exists
    const membership = await OrganizationMembershipRepository.findByUserAndOrg(userId, organizationId);
    if (!membership) {
      throw new NotFoundError("Não é membro desta organização");
    }

    // Cannot leave if owner - owners must transfer ownership first
    if (membership.role === 'owner') {
      throw new BadRequestError("Proprietários não podem sair da organização. Transfira a propriedade primeiro.");
    }

    // Delete membership
    await OrganizationMembershipRepository.deleteByUserAndOrg(userId, organizationId);

    // If this was the user's active organization, switch to another
    if (user.activeOrganizationId === organizationId) {
      const remainingMemberships = await OrganizationMembershipRepository.findByUserId(userId);
      if (remainingMemberships.length > 0) {
        await UserRepository.update(userId, {
          activeOrganizationId: remainingMemberships[0].organizationId,
        });
      } else {
        await UserRepository.update(userId, {
          activeOrganizationId: null,
        });
      }
    }
  }
}
