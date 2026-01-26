import { Router } from "express";
import { RecurringTransactionController } from "../controllers/recurring-transaction.controller.js";
import { authenticate, requireActiveSubscription } from "../middlewares/auth.js";
import { organizationContext } from "../middlewares/organization.js";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(organizationContext);
router.use(requireActiveSubscription);

// GET /api/recurring-transactions - Listar todas as transações recorrentes
router.get("/", RecurringTransactionController.getAll);

// GET /api/recurring-transactions/upcoming - Próximas execuções (deve vir antes de /:id)
router.get("/upcoming", RecurringTransactionController.getUpcoming);

// POST /api/recurring-transactions - Criar transação recorrente
router.post("/", RecurringTransactionController.create);

// POST /api/recurring-transactions/process - Processar todas (admin)
router.post("/process", RecurringTransactionController.processAll);

// GET /api/recurring-transactions/:id - Buscar transação recorrente por ID
router.get("/:id", RecurringTransactionController.getById);

// PUT /api/recurring-transactions/:id - Atualizar transação recorrente
router.put("/:id", RecurringTransactionController.update);

// GET /api/recurring-transactions/:id/history - Histórico de execuções
router.get("/:id/history", RecurringTransactionController.getExecutionHistory);

// POST /api/recurring-transactions/:id/activate - Ativar recorrência
router.post("/:id/activate", RecurringTransactionController.activate);

// POST /api/recurring-transactions/:id/deactivate - Desativar recorrência
router.post("/:id/deactivate", RecurringTransactionController.deactivate);

// POST /api/recurring-transactions/:id/execute - Executar agora
router.post("/:id/execute", RecurringTransactionController.executeNow);

// DELETE /api/recurring-transactions/:id - Excluir transação recorrente
router.delete("/:id", RecurringTransactionController.delete);

export default router;