import { Router } from "express";
import { AccountTypeController } from "../controllers/account-type.controller.js";

const router = Router();

// GET /api/account-types - Lista todos os tipos de conta
router.get("/", AccountTypeController.getAccountTypes);

// GET /api/account-types/:code - Busca tipo de conta por código
router.get("/:code", AccountTypeController.getAccountTypeByCode);

export default router;
