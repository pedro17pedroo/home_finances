import { Router } from "express";
import { LoanController } from "../controllers/loan.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { 
  createLoanSchema, 
  updateLoanSchema, 
  loanIdSchema,
  loanFiltersSchema 
} from "../validators/loan.validator.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/loans - Listar empréstimos
router.get("/", validate(loanFiltersSchema), LoanController.getAll);

// GET /api/loans/summary - Resumo de empréstimos
router.get("/summary", LoanController.getSummary);

// GET /api/loans/overdue - Empréstimos em atraso
router.get("/overdue", LoanController.getOverdue);

// GET /api/loans/:id - Obter empréstimo por ID
router.get("/:id", validate(loanIdSchema), LoanController.getById);

// POST /api/loans - Criar empréstimo
router.post("/", validate(createLoanSchema), LoanController.create);

// PUT /api/loans/:id - Atualizar empréstimo
router.put("/:id", validate(loanIdSchema), validate(updateLoanSchema), LoanController.update);

// DELETE /api/loans/:id - Remover empréstimo
router.delete("/:id", validate(loanIdSchema), LoanController.delete);

export default router;