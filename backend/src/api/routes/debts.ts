import { Router } from "express";
import { DebtController } from "../controllers/debt.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { 
  createDebtSchema, 
  updateDebtSchema, 
  debtIdSchema,
  debtFiltersSchema 
} from "../validators/debt.validator.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

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

// PUT /api/debts/:id - Atualizar dívida
router.put("/:id", validate(debtIdSchema), validate(updateDebtSchema), DebtController.update);

// DELETE /api/debts/:id - Remover dívida
router.delete("/:id", validate(debtIdSchema), DebtController.delete);

export default router;