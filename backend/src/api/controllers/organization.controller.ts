import { Request, Response, NextFunction } from "express";
import { OrganizationService } from "../../domain/services/organization.service.js";
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
   */
  static async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, firstName, lastName, password, phone } = req.body;

      if (!token || !firstName || !lastName || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Token, nome, sobrenome e senha são obrigatórios',
        });
      }

      const result = await OrganizationService.acceptInvitation({
        token,
        firstName,
        lastName,
        password,
        phone,
      });

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
        },
        message: 'Convite aceito com sucesso! Faça login para continuar.',
      });
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
      const { email, role } = req.body;

      if (!organizationId) {
        return res.status(404).json({
          status: 'error',
          message: 'Você não pertence a nenhuma organização',
        });
      }

      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email é obrigatório',
        });
      }

      const invitation = await OrganizationService.inviteMember(
        organizationId,
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
}
