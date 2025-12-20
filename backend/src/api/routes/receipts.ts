import { Router } from "express";
import { ReceiptsController } from "../controllers/receipts.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Todas as rotas de recibos requerem autenticação
router.use(authenticate);

// Visualizar recibo (inline no browser)
router.get("/:transactionId/view", ReceiptsController.viewReceipt);

// Baixar recibo (forçar download)
router.get("/:transactionId/download", ReceiptsController.downloadReceipt);

// Obter informações do recibo
router.get("/:transactionId/info", ReceiptsController.getReceiptInfo);

// Listar transações com recibos
router.get("/", ReceiptsController.getTransactionsWithReceipts);

export default router;