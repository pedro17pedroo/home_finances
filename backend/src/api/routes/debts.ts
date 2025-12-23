import { Router } from "express";
import { DebtController } from "../controllers/debt.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { organizationContext } from "../middlewares/organization.js";
import { validate } from "../middlewares/validate.js";
import { 
  createDebtSchema, 
  debtIdSchema,
  debtFiltersSchema 
} from "../validators/debt.validator.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(organizationContext);

// GET /api/debts - Listar dívidas
router.get("/", validate(debtFiltersSchema), DebtController.getAll);

// GET /api/debts/summary - Resumo de dívidas
router.get("/summary", DebtController.getSummary);

// GET /api/debts/overdue - Dívidas em atraso
router.get("/overdue", DebtController.getOverdue);

// GET /api/debts/:id - Obter dívida por ID
router.get("/:id", validate(debtIdSchema), DebtController.getById);

// POST /api/debts - Criar dívida
router.post("/", validate(createDebtSchema), DebtController.create);

// POST /api/debts/:id/payment - Registar pagamento
router.post("/:id/payment", validate(debtIdSchema), DebtController.makePayment);

// POST /api/debts/:id/cancel - Cancelar dívida
router.post("/:id/cancel", validate(debtIdSchema), DebtController.cancel);

export default router;