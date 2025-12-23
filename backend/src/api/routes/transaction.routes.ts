import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller.js";
import { authenticate, requireActiveSubscription } from "../middlewares/auth.js";
import { organizationContext } from "../middlewares/organization.js";
import { validate } from "../middlewares/validate.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsSchema,
  transactionParamsSchema,
} from "../validators/transaction.validator.js";

const router = Router();

// All routes require authentication and active subscription
router.use(authenticate);
router.use(organizationContext);
router.use(requireActiveSubscription);

router.get(
  "/",
  validate(getTransactionsSchema),
  TransactionController.getAll
);

router.get("/summary", TransactionController.getSummary);

router.get(
  "/:id",
  validate(transactionParamsSchema),
  TransactionController.getById
);

router.post(
  "/",
  validate(createTransactionSchema),
  TransactionController.create
);

router.put(
  "/:id",
  validate(transactionParamsSchema),
  validate(updateTransactionSchema),
  TransactionController.update
);

router.delete(
  "/:id",
  validate(transactionParamsSchema),
  TransactionController.delete
);

export default router;