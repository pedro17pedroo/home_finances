import { Router } from "express";
import { AccountTypeController } from "../controllers/account-type.controller.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Public routes
// GET /api/account-types - Lista todos os tipos de conta ativos
router.get("/", AccountTypeController.getAccountTypes);

// GET /api/account-types/:code - Busca tipo de conta por código
router.get("/:code", AccountTypeController.getAccountTypeByCode);

// Admin routes
router.get("/admin/all", requireAdmin, AccountTypeController.getAllAccountTypes);
router.post("/admin/create", requireAdmin, AccountTypeController.createAccountType);
router.put("/admin/:id", requireAdmin, AccountTypeController.updateAccountType);
router.delete("/admin/:id", requireAdmin, AccountTypeController.deleteAccountType);
router.patch("/admin/:id/toggle", requireAdmin, AccountTypeController.toggleAccountType);

export default router;
