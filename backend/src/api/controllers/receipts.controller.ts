import { Request, Response, NextFunction } from "express";
import { TransactionRepository } from "../../domain/repositories/transaction.repository.js";
import { NotFoundError, ForbiddenError } from "../../core/errors/app-error.js";
import { logger } from "../../core/utils/logger.js";
import path from 'path';
import { promises as fs } from 'fs';

export class ReceiptsController {
  /**
   * Visualizar recibo de uma transação
   */
  static async viewReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Usuário não autenticado"
        });
      }

      // Buscar transação
      const transaction = await TransactionRepository.findById(parseInt(transactionId));
      
      if (!transaction) {
        throw new NotFoundError("Transação não encontrada");
      }

      // Verificar se a transação pertence ao usuário
      if (transaction.userId !== userId) {
        throw new ForbiddenError("Acesso negado a esta transação");
      }

      // Verificar se a transação tem recibo
      if (!transaction.receiptPath) {
        return res.status(404).json({
          status: "error",
          message: "Esta transação não possui recibo anexado"
        });
      }

      // Construir caminho completo do arquivo
      const uploadsBasePath = process.env.WHATSAPP_MEDIA_UPLOAD_PATH || 'uploads/receipts';
      const fullPath = path.join(uploadsBasePath, transaction.receiptPath);

      // Verificar se o arquivo existe
      try {
        await fs.access(fullPath);
      } catch (error) {
        logger.error(`Arquivo de recibo não encontrado: ${fullPath}`);
        return res.status(404).json({
          status: "error",
          message: "Arquivo de recibo não encontrado"
        });
      }

      // Definir headers apropriados
      const mimeType = transaction.receiptMimeType || 'application/octet-stream';
      const originalName = transaction.receiptOriginalName || 'recibo';
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
      
      // Para PDFs, permitir visualização no browser
      if (mimeType === 'application/pdf') {
        res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
      }

      // Enviar arquivo
      res.sendFile(path.resolve(fullPath));

    } catch (error) {
      logger.error('Erro ao visualizar recibo:', error);
      next(error);
    }
  }

  /**
   * Baixar recibo de uma transação
   */
  static async downloadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Usuário não autenticado"
        });
      }

      // Buscar transação
      const transaction = await TransactionRepository.findById(parseInt(transactionId));
      
      if (!transaction) {
        throw new NotFoundError("Transação não encontrada");
      }

      // Verificar se a transação pertence ao usuário
      if (transaction.userId !== userId) {
        throw new ForbiddenError("Acesso negado a esta transação");
      }

      // Verificar se a transação tem recibo
      if (!transaction.receiptPath) {
        return res.status(404).json({
          status: "error",
          message: "Esta transação não possui recibo anexado"
        });
      }

      // Construir caminho completo do arquivo
      const uploadsBasePath = process.env.WHATSAPP_MEDIA_UPLOAD_PATH || 'uploads/receipts';
      const fullPath = path.join(uploadsBasePath, transaction.receiptPath);

      // Verificar se o arquivo existe
      try {
        await fs.access(fullPath);
      } catch (error) {
        logger.error(`Arquivo de recibo não encontrado: ${fullPath}`);
        return res.status(404).json({
          status: "error",
          message: "Arquivo de recibo não encontrado"
        });
      }

      // Definir headers para download
      const mimeType = transaction.receiptMimeType || 'application/octet-stream';
      const originalName = transaction.receiptOriginalName || 'recibo';
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);

      // Enviar arquivo
      res.sendFile(path.resolve(fullPath));

    } catch (error) {
      logger.error('Erro ao baixar recibo:', error);
      next(error);
    }
  }

  /**
   * Listar transações com recibos
   */
  static async getTransactionsWithReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Usuário não autenticado"
        });
      }

      // Buscar transações do usuário que têm recibos
      const transactions = await TransactionRepository.findByUserId(userId);
      const transactionsWithReceipts = transactions.filter(t => t.receiptPath);

      // Formatar resposta
      const formattedTransactions = transactionsWithReceipts.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        receiptInfo: {
          hasReceipt: true,
          mimeType: transaction.receiptMimeType,
          originalName: transaction.receiptOriginalName,
          fileSize: transaction.receiptFileSize,
          viewUrl: `/api/receipts/${transaction.id}/view`,
          downloadUrl: `/api/receipts/${transaction.id}/download`
        }
      }));

      res.json({
        status: "success",
        data: {
          transactions: formattedTransactions,
          total: formattedTransactions.length
        }
      });

    } catch (error) {
      logger.error('Erro ao listar transações com recibos:', error);
      next(error);
    }
  }

  /**
   * Obter informações do recibo
   */
  static async getReceiptInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: "error",
          message: "Usuário não autenticado"
        });
      }

      // Buscar transação
      const transaction = await TransactionRepository.findById(parseInt(transactionId));
      
      if (!transaction) {
        throw new NotFoundError("Transação não encontrada");
      }

      // Verificar se a transação pertence ao usuário
      if (transaction.userId !== userId) {
        throw new ForbiddenError("Acesso negado a esta transação");
      }

      // Verificar se a transação tem recibo
      if (!transaction.receiptPath) {
        return res.json({
          status: "success",
          data: {
            hasReceipt: false
          }
        });
      }

      // Retornar informações do recibo
      res.json({
        status: "success",
        data: {
          hasReceipt: true,
          mimeType: transaction.receiptMimeType,
          originalName: transaction.receiptOriginalName,
          fileSize: transaction.receiptFileSize,
          viewUrl: `/api/receipts/${transaction.id}/view`,
          downloadUrl: `/api/receipts/${transaction.id}/download`
        }
      });

    } catch (error) {
      logger.error('Erro ao obter informações do recibo:', error);
      next(error);
    }
  }
}