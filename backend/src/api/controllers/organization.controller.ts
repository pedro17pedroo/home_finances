import { Request, Response, NextFunction } from "express";
import { OrganizationService } from "../../domain/services/organization.service.js";
import { OrganizationMembershipService } from "../../domain/services/organization-membership.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

export class OrganizationController {
  /**
   * Get current user's organization
   */
  static async getMyOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organization = await OrganizationService.getUserOrganization(userId);
      
      if (!organization) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      res.json({
        status: 'success',
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId } = req.params;
      const { name } = req.body;

      const organization = await OrganizationService.updateOrganization(
        parseInt(organizationId),
        userId,
        { name }
      );

      res.json({
        status: 'success',
        data: organization,
        message: 'Organização atualizada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization members
   */
  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId } = req.params;

      const members = await OrganizationService.getMembers(parseInt(organizationId), userId);

      res.json({
        status: 'success',
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite a new member
   */
  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId } = req.params;
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email é obrigatório',
        });
      }

      const invitation = await OrganizationService.inviteMember(
        parseInt(organizationId),
        userId,
        { email, role }
      );

      res.status(201).json({
        status: 'success',
        data: invitation,
        message: 'Convite enviado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invitations
   */
  static async getPendingInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId } = req.params;

      const invitations = await OrganizationService.getPendingInvitations(
        parseInt(organizationId),
        userId
      );

      res.json({
        status: 'success',
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { invitationId } = req.params;

      await OrganizationService.cancelInvitation(parseInt(invitationId), userId);

      res.json({
        status: 'success',
        message: 'Convite cancelado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitation details by token (public endpoint)
   */
  static async getInvitationByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      const result = await OrganizationService.getInvitationByToken(token);

      res.json({
        status: 'success',
        data: {
          email: result.invitation.email,
          role: result.invitation.role,
          organizationName: result.organization.name,
          expiresAt: result.invitation.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an invitation (public endpoint)
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4
   * - For existing users: firstName, lastName, password are optional (uses existing account)
   * - For new users: firstName, lastName, password are required
   */
  static async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, firstName, lastName, password, phone } = req.body;

      if (!token) {
        return res.status(400).json({
          status: 'error',
          message: 'Token é obrigatório',
        });
      }

      // For new users, firstName, lastName, and password are required
      // For existing users, these fields are optional (we use their existing data)
      // The service will determine if user exists based on the invitation email
      const result = await OrganizationService.acceptInvitation({
        token,
        firstName: firstName || '',
        lastName: lastName || '',
        password: password || '',
        phone,
      });

      // Different response based on whether user already existed
      if (result.isExistingUser) {
        // Existing user - just added membership
        res.status(200).json({
          status: 'success',
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              role: result.user.role,
            },
            organization: result.organization,
            isExistingUser: true,
          },
          message: 'Convite aceito com sucesso! Você foi adicionado à organização.',
        });
      } else {
        // New user - created account and added to org
        res.status(201).json({
          status: 'success',
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              role: result.user.role,
            },
            organization: result.organization,
            isExistingUser: false,
          },
          message: 'Conta criada e convite aceito com sucesso! Faça login para continuar.',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a member from organization
   */
  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId, memberId } = req.params;

      await OrganizationService.removeMember(
        parseInt(organizationId),
        parseInt(memberId),
        userId
      );

      res.json({
        status: 'success',
        message: 'Membro removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId, memberId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Função inválida. Use "admin" ou "member"',
        });
      }

      const member = await OrganizationService.updateMemberRole(
        parseInt(organizationId),
        parseInt(memberId),
        role,
        userId
      );

      res.json({
        status: 'success',
        data: member,
        message: 'Função atualizada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  // Simplified methods that use user's organization automatically

  /**
   * Get members of user's organization
   */
  static async getMyMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = authReq.user!.organizationId;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      const members = await OrganizationService.getMembers(organizationId, userId);

      res.json({
        status: 'success',
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitations of user's organization
   */
  static async getMyInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = authReq.user!.organizationId;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      const invitations = await OrganizationService.getPendingInvitations(organizationId, userId);

      res.json({
        status: 'success',
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite to user's organization
   */
  static async inviteToMyOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = authReq.user!.organizationId;
      const { email, phone, role } = req.body;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      if (!email && !phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Email ou telefone é obrigatório',
        });
      }

      const invitation = await OrganizationService.inviteMember(
        organizationId,
        userId,
        { email, phone, role }
      );

      res.status(201).json({
        status: 'success',
        data: invitation,
        message: 'Convite enviado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from user's organization
   */
  static async removeMyMember(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = authReq.user!.organizationId;
      const { memberId } = req.params;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      await OrganizationService.removeMember(
        organizationId,
        parseInt(memberId),
        userId
      );

      res.json({
        status: 'success',
        message: 'Membro removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role in user's organization
   */
  static async updateMyMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = authReq.user!.organizationId;
      const { memberId } = req.params;
      const { role } = req.body;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Função inválida. Use "admin" ou "member"',
        });
      }

      const member = await OrganizationService.updateMemberRole(
        organizationId,
        parseInt(memberId),
        role,
        userId
      );

      res.json({
        status: 'success',
        data: member,
        message: 'Função atualizada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Multi-Organization Membership Endpoints
  // ============================================

  /**
   * GET /api/organizations/my - Get all organizations user belongs to
   * Returns all organizations with role, subscription status, member count
   * Requirements: 3.4, 7.1, 7.2
   */
  static async getMyOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;

      const memberships = await OrganizationMembershipService.getUserMemberships(userId);

      // Get member count for each organization
      const organizationsWithCounts = await Promise.all(
        memberships.map(async (membership) => {
          const memberCount = await OrganizationMembershipService.getMemberCount(membership.organizationId);
          return {
            id: membership.organizationId,
            name: membership.organizationName,
            role: membership.role,
            subscription: {
              planType: membership.planType || 'basic',
              status: membership.subscriptionStatus || 'trialing',
            },
            memberCount,
            isActive: membership.isActive,
          };
        })
      );

      res.json({
        status: 'success',
        data: {
          organizations: organizationsWithCounts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/organizations - Create a new organization
   * Any user can create a new organization and become its owner
   * Requirements: 2.1, 2.2, 2.3
   */
  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { name, planId } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Nome da organização é obrigatório',
        });
      }

      const result = await OrganizationMembershipService.createOrganizationWithOwner(
        userId,
        name.trim(),
        planId
      );

      res.status(201).json({
        status: 'success',
        data: {
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            planType: result.organization.planType,
            subscriptionStatus: result.organization.subscriptionStatus,
          },
          membership: {
            id: result.membership.id,
            role: result.membership.role,
          },
        },
        message: 'Organização criada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/organizations/switch - Switch active organization
   * Verify membership before switching, update activeOrganizationId
   * Requirements: 3.3
   */
  static async switchOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const { organizationId } = req.body;

      if (!organizationId || typeof organizationId !== 'number') {
        return res.status(400).json({
          status: 'error',
          message: 'ID da organização é obrigatório',
        });
      }

      const result = await OrganizationMembershipService.switchOrganization(userId, organizationId);

      res.json({
        status: 'success',
        data: {
          user: result.user,
          activeOrganization: result.activeOrganization,
        },
        message: 'Organização alterada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:id/leave - Leave an organization
   * Verify user is not owner, remove membership, switch to another org if leaving active
   * Requirements: 1.5, 7.5
   */
  static async leaveOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const organizationId = parseInt(req.params.id);

      if (isNaN(organizationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'ID da organização inválido',
        });
      }

      await OrganizationMembershipService.leaveOrganization(userId, organizationId);

      // Get updated memberships to return new active org
      const memberships = await OrganizationMembershipService.getUserMemberships(userId);
      const activeOrg = memberships.find(m => m.isActive);

      res.json({
        status: 'success',
        data: {
          activeOrganization: activeOrg || null,
          remainingMemberships: memberships.length,
        },
        message: 'Você saiu da organização com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitations received by the current user (by email or phone)
   */
  static async getMyReceivedInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;

      const invitations = await OrganizationService.getReceivedInvitations(userId);

      res.json({
        status: 'success',
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an invitation by ID (for authenticated users)
   */
  static async acceptInvitationById(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const invitationId = parseInt(req.params.invitationId);

      if (isNaN(invitationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'ID do convite inválido',
        });
      }

      const result = await OrganizationService.acceptInvitationById(invitationId, userId);

      res.json({
        status: 'success',
        data: result,
        message: 'Convite aceite com sucesso! Você agora é membro da organização.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject an invitation
   */
  static async rejectInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user!.id;
      const invitationId = parseInt(req.params.invitationId);

      if (isNaN(invitationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'ID do convite inválido',
        });
      }

      await OrganizationService.rejectInvitation(invitationId, userId);

      res.json({
        status: 'success',
        message: 'Convite rejeitado.',
      });
    } catch (error) {
      next(error);
    }
  }
}
