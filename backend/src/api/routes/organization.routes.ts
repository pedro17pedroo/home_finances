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

// Get current user's organization
router.get("/my", OrganizationController.getMyOrganization);

// Update organization
router.put("/:organizationId", OrganizationController.updateOrganization);

// Get organization members
router.get("/:organizationId/members", OrganizationController.getMembers);

// Invite a new member
router.post("/:organizationId/invitations", OrganizationController.inviteMember);

// Get pending invitations
router.get("/:organizationId/invitations", OrganizationController.getPendingInvitations);

// Cancel an invitation
router.delete("/invitations/:invitationId", OrganizationController.cancelInvitation);

// Remove a member
router.delete("/:organizationId/members/:memberId", OrganizationController.removeMember);

// Update member role
router.put("/:organizationId/members/:memberId/role", OrganizationController.updateMemberRole);

export default router;
