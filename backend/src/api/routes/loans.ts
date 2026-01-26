import { Router } from "express";
import { LoanController } from "../controllers/loan.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { organizationContext } from "../middlewares/organization.js";
import { validate } from "../middlewares/validate.js";
import { 
  createLoanSchema, 
  loanIdSchema,
  loanFiltersSchema 
} from "../validators/loan.validator.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(organizationContext);

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

// POST /api/loans/:id/payment - Registar pagamento
router.post("/:id/payment", validate(loanIdSchema), LoanController.makePayment);

// POST /api/loans/:id/cancel - Cancelar empréstimo
router.post("/:id/cancel", validate(loanIdSchema), LoanController.cancel);

// POST /api/loans/:id/send-reminder - Enviar lembrete de pagamento
router.post("/:id/send-reminder", validate(loanIdSchema), LoanController.sendReminder);

export default router;