import { Router } from "express";
import { RecurringTransactionController } from "../controllers/recurring-transaction.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/recurring-transactions/upcoming - Próximas execuções
router.get("/upcoming", RecurringTransactionController.getUpcoming);

// POST /api/recurring-transactions/:id/deactivate - Desativar recorrência
router.post("/:id/deactivate", RecurringTransactionController.deactivate);

// POST /api/recurring-transactions/process - Processar todas (admin)
router.post("/process", RecurringTransactionController.processAll);

export default router;