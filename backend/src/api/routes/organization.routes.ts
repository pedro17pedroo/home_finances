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

// ============================================
// Multi-Organization Membership Endpoints
// Requirements: 2.1, 2.2, 2.3, 3.3, 3.4, 7.1, 7.2, 7.5
// ============================================

// GET /api/organizations/my - Get all organizations user belongs to
// Returns all organizations with role, subscription status, member count
router.get("/my", OrganizationController.getMyOrganizations);

// POST /api/organizations - Create a new organization
// Any user can create a new organization and become its owner
router.post("/", OrganizationController.createOrganization);

// POST /api/organizations/switch - Switch active organization
// Verify membership before switching, update activeOrganizationId
router.post("/switch", OrganizationController.switchOrganization);

// DELETE /api/organizations/:id/leave - Leave an organization
// Verify user is not owner, remove membership, switch to another org if leaving active
router.delete("/:id/leave", OrganizationController.leaveOrganization);

// ============================================
// Legacy Single-Organization Endpoints
// ============================================

// Get current user's organization (legacy - returns single org)
router.get("/", OrganizationController.getMyOrganization);

// Get organization members (simplified - uses user's org)
router.get("/members", OrganizationController.getMyMembers);

// Get pending invitations (simplified - uses user's org)
router.get("/invitations", OrganizationController.getMyInvitations);

// Invite a new member (simplified - uses user's org)
router.post("/invite", OrganizationController.inviteToMyOrg);

// Get invitations received by the current user
router.get("/my-invitations", OrganizationController.getMyReceivedInvitations);

// Accept an invitation
router.post("/invitations/:invitationId/accept", OrganizationController.acceptInvitationById);

// Reject an invitation
router.post("/invitations/:invitationId/reject", OrganizationController.rejectInvitation);

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
