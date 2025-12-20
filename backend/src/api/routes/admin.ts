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

// Content management
router.get("/landing-content", AdminController.getLandingContent);
router.put("/landing-content/:section", AdminController.updateLandingContent);

router.get("/legal-content", AdminController.getLegalContent);
router.put("/legal-content/:type", AdminController.updateLegalContent);

// Audit logs
router.get("/audit-logs", AdminController.getAuditLogs);

export default router;