import { Router } from "express";
import { AccountController } from "../controllers/account.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { 
  createAccountSchema, 
  updateAccountSchema, 
  accountIdSchema 
} from "../validators/account.validator.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/accounts - Get all user accounts
router.get("/", AccountController.getAccounts);

// GET /api/accounts/savings - Get user savings accounts
router.get("/savings", AccountController.getSavingsAccounts);

// GET /api/accounts/summary - Get account summary
router.get("/summary", AccountController.getAccountSummary);

// GET /api/accounts/:id - Get specific account
router.get("/:id", 
  validate(accountIdSchema), 
  AccountController.getAccountById
);

// POST /api/accounts - Create new account
router.post("/", 
  validate(createAccountSchema), 
  AccountController.createAccount
);

// PUT /api/accounts/:id - Update account
router.put("/:id", 
  validate(accountIdSchema),
  validate(updateAccountSchema), 
  AccountController.updateAccount
);

// DELETE /api/accounts/:id - Delete account
router.delete("/:id", 
  validate(accountIdSchema), 
  AccountController.deleteAccount
);

export default router;