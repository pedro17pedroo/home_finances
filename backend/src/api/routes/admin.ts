import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
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

// Plans management
router.get("/plans", AdminController.getPlans);
router.post("/plans", AdminController.createPlan);
router.put("/plans/:id", AdminController.updatePlan);
router.delete("/plans/:id", AdminController.deletePlan);

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