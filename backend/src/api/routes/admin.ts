import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminPlanController } from "../controllers/admin-plan.controller.js";
import { AdminSubscriptionController } from "../controllers/admin-subscription.controller.js";
import { AdminCampaignController } from "../controllers/admin-campaign.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.post("/login", AdminController.login);

// Protected admin routes
router.use(authenticate); // Todas as rotas abaixo requerem autenticação

// Dashboard
router.get("/dashboard", AdminController.getDashboard);
router.get("/dashboard/stats", AdminController.getDashboardStats);

// Admin management
router.post("/admins", AdminController.createAdmin);

// Plans management (legacy - keeping for compatibility)
router.get("/plans", AdminController.getPlans);
router.post("/plans", AdminController.createPlan);
router.put("/plans/:id", AdminController.updatePlan);
router.delete("/plans/:id", AdminController.deletePlan);

// Plans management (new - with full features)
router.get("/plans-v2", AdminPlanController.getAllPlans);
router.post("/plans-v2", AdminPlanController.createPlan);
router.get("/plans-v2/:id", AdminPlanController.getPlanById);
router.put("/plans-v2/:id", AdminPlanController.updatePlan);
router.patch("/plans-v2/:id/toggle", AdminPlanController.togglePlanStatus);
router.delete("/plans-v2/:id", AdminPlanController.deletePlan);
router.get("/plans-v2/:id/stats", AdminPlanController.getPlanStats);

// Subscriptions management
router.get("/subscriptions", AdminSubscriptionController.getAllSubscriptions);
router.get("/subscriptions/stats", AdminSubscriptionController.getStats);
router.get("/subscriptions/export", AdminSubscriptionController.exportSubscriptions);
router.get("/subscriptions/:id", AdminSubscriptionController.getSubscriptionById);
router.patch("/subscriptions/:id/status", AdminSubscriptionController.updateStatus);
router.post("/subscriptions/:id/extend", AdminSubscriptionController.extendSubscription);

// Campaigns/Coupons management
router.get("/campaigns", AdminCampaignController.getAllCampaigns);
router.post("/campaigns", AdminCampaignController.createCampaign);
router.get("/campaigns/:id", AdminCampaignController.getCampaignById);
router.put("/campaigns/:id", AdminCampaignController.updateCampaign);
router.patch("/campaigns/:id/toggle", AdminCampaignController.toggleCampaignStatus);
router.delete("/campaigns/:id", AdminCampaignController.deleteCampaign);
router.get("/campaigns/:id/usage", AdminCampaignController.getCampaignUsage);
router.get("/campaigns/:id/stats", AdminCampaignController.getCampaignStats);

// Users management
router.get("/users", AdminController.getUsers);
router.get("/users/stats", AdminController.getUserStats);
router.patch("/users/:id/status", AdminController.updateUserStatus);

// Payments management
router.get("/payments", AdminController.getPayments);
router.post("/payments/:id/approve", AdminController.approvePayment);
router.post("/payments/:id/reject", AdminController.rejectPayment);

// Security management
router.get("/security/events", AdminController.getSecurityEvents);
router.post("/security/events/:id/resolve", AdminController.resolveSecurityEvent);
router.get("/security/blocked-ips", AdminController.getBlockedIPs);
router.post("/security/blocked-ips", AdminController.blockIP);
router.delete("/security/blocked-ips/:id", AdminController.unblockIP);

// Notifications management
router.get("/notifications", AdminController.getNotifications);
router.post("/notifications", AdminController.sendNotification);
router.delete("/notifications/:id", AdminController.deleteNotification);

// Settings management
router.get("/settings", AdminController.getSettings);
router.put("/settings", AdminController.updateSettings);

// Reports
router.get("/reports", AdminController.getReports);

// Content management
router.get("/content/:type", AdminController.getContent);
router.put("/content/:id", AdminController.updateContent);
router.get("/landing-content", AdminController.getLandingContent);
router.put("/landing-content/:section", AdminController.updateLandingContent);
router.get("/legal-content", AdminController.getLegalContent);
router.put("/legal-content/:type", AdminController.updateLegalContent);

// Audit logs
router.get("/audit-logs", AdminController.getAuditLogs);

export default router;