import { Router } from "express";
import { OrganizationController } from "../controllers/organization.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Public routes (no authentication required)
// Get invitation details by token
router.get("/invitations/token/:token", OrganizationController.getInvitationByToken);

// Accept invitation
router.post("/invitations/accept", OrganizationController.acceptInvitation);

// Protected routes (authentication required)
router.use(authenticate);

// Get current user's organization (simplified route)
router.get("/", OrganizationController.getMyOrganization);
router.get("/my", OrganizationController.getMyOrganization);

// Get organization members (simplified - uses user's org)
router.get("/members", OrganizationController.getMyMembers);

// Get pending invitations (simplified - uses user's org)
router.get("/invitations", OrganizationController.getMyInvitations);

// Invite a new member (simplified - uses user's org)
router.post("/invite", OrganizationController.inviteToMyOrg);

// Update organization
router.put("/:organizationId", OrganizationController.updateOrganization);

// Get organization members (with org ID)
router.get("/:organizationId/members", OrganizationController.getMembers);

// Invite a new member (with org ID)
router.post("/:organizationId/invitations", OrganizationController.inviteMember);

// Get pending invitations (with org ID)
router.get("/:organizationId/invitations", OrganizationController.getPendingInvitations);

// Cancel an invitation
router.delete("/invitations/:invitationId", OrganizationController.cancelInvitation);

// Remove a member
router.delete("/:organizationId/members/:memberId", OrganizationController.removeMember);
router.delete("/members/:memberId", OrganizationController.removeMyMember);

// Update member role
router.put("/:organizationId/members/:memberId/role", OrganizationController.updateMemberRole);
router.put("/members/:memberId/role", OrganizationController.updateMyMemberRole);

export default router;
