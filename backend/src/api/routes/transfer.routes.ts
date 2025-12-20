import { Router } from "express";
import { TransferController } from "../controllers/transfer.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { 
  createTransferSchema, 
  transferFiltersSchema,
  transferIdSchema,
  accountIdSchema
} from "../validators/transfer.validator.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/transfers - Get all user transfers
router.get("/", 
  validate(transferFiltersSchema), 
  TransferController.getTransfers
);

// GET /api/transfers/summary - Get transfer summary
router.get("/summary", TransferController.getTransferSummary);

// GET /api/transfers/account/:accountId - Get transfers for specific account
router.get("/account/:accountId", 
  validate(accountIdSchema), 
  TransferController.getAccountTransferHistory
);

// GET /api/transfers/:id - Get specific transfer
router.get("/:id", 
  validate(transferIdSchema), 
  TransferController.getTransferById
);

// POST /api/transfers - Create new transfer
router.post("/", 
  validate(createTransferSchema), 
  TransferController.createTransfer
);

// DELETE /api/transfers/:id - Reverse transfer
router.delete("/:id", 
  validate(transferIdSchema), 
  TransferController.deleteTransfer
);

export default router;