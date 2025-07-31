import { Request, Response } from 'express';
import { db } from '../db';
import { paymentTransactions, paymentConfirmations, plans, paymentMethods } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { SubscriptionService } from '../services/subscriptionService';
import { nanoid } from 'nanoid';
import type { UploadedFile } from 'express-fileupload';

export class PaymentController {
  /**
   * Initiate payment process
   */
  static async initiatePayment(req: Request, res: Response) {
    try {
      const { planId, paymentMethodId } = req.body;
      const userId = (req as any).session?.userId;

      console.log('=== Payment Initiation Debug ===');
      console.log('Request body:', req.body);
      console.log('planId:', planId, 'type:', typeof planId);
      console.log('paymentMethodId:', paymentMethodId, 'type:', typeof paymentMethodId);
      console.log('userId:', userId);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get plan details - ensure planId is an integer
      const planIdInt = parseInt(planId);
      console.log('Converted planId to int:', planIdInt);
      
      const planResult = await db.select().from(plans).where(eq(plans.id, planIdInt));
      console.log('Plan query result:', planResult);
      
      const [plan] = planResult;
      if (!plan) {
        console.log('Plan not found! Available plans:');
        const allPlans = await db.select().from(plans);
        console.log('Available plans:', allPlans.map(p => ({ id: p.id, name: p.name, type: p.type })));
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      
      console.log('Found plan:', { id: plan.id, name: plan.name, price: plan.price });

      // Get payment method details
      const [paymentMethod] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      // Create payment transaction  
      const [transaction] = await db.insert(paymentTransactions).values({
        userId: userId,
        planId: planId,
        paymentMethodId: paymentMethodId,
        amount: plan.price,
        finalAmount: plan.price,
        discountAmount: "0",
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: {
          planName: plan.name,
          planType: plan.type
        }
      }).returning();

      res.json({
        id: transaction.id,
        transactionId: transaction.id,
        amount: parseFloat(transaction.amount),
        finalAmount: parseFloat(transaction.finalAmount),
        plan: {
          id: plan.id,
          name: plan.name,
          type: plan.type
        },
        paymentMethod: paymentMethod,
        paymentMethodId,
        status: transaction.status
      });
    } catch (error) {
      console.error('Initiate payment error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Upload payment confirmation (for manual payment methods)
   */
  static async uploadConfirmation(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { notes, bankReference, phoneNumber } = req.body;
      const userId = (req as any).session?.userId;
      const file = req.files?.receipt as UploadedFile;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!file) {
        return res.status(400).json({ message: "Receipt file is required" });
      }

      // Verify transaction belongs to user
      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(and(
          eq(paymentTransactions.id, parseInt(transactionId)),
          eq(paymentTransactions.userId, userId)
        ));

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Save file (in production, use cloud storage like AWS S3)
      const fileName = `receipt_${transactionId}_${Date.now()}_${file.name}`;
      const filePath = `./uploads/receipts/${fileName}`;
      
      // Ensure upload directory exists
      const fs = await import('fs');
      const path = await import('path');
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      await file.mv(filePath);

      // Create confirmation record
      const [confirmation] = await db.insert(paymentConfirmations).values({
        paymentTransactionId: parseInt(transactionId),
        userId: userId,
        paymentProof: filePath,
        bankReference: bankReference || null,
        phoneNumber: phoneNumber || null,
        notes: notes || null,
        status: 'pending',
        paymentDate: new Date()
      }).returning();

      // Update transaction status
      await db.update(paymentTransactions)
        .set({ 
          status: 'processing',
          updatedAt: new Date()
        })
        .where(eq(paymentTransactions.id, parseInt(transactionId)));

      res.json({
        message: "Receipt uploaded successfully",
        confirmationId: confirmation.id,
        status: "processing",
        estimatedProcessingTime: "1-3 business days"
      });
    } catch (error) {
      console.error('Upload confirmation error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Check payment status
   */
  static async getPaymentStatus(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const userId = (req as any).session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(and(
          eq(paymentTransactions.id, parseInt(transactionId)),
          eq(paymentTransactions.userId, userId)
        ));

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Get confirmation if exists
      const [confirmation] = await db.select()
        .from(paymentConfirmations)
        .where(eq(paymentConfirmations.paymentTransactionId, parseInt(transactionId)));

      res.json({
        transaction,
        confirmation: confirmation || null,
        statusDescription: this.getStatusDescription(transaction.status)
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get user payment history
   */
  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const transactions = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId));

      res.json(transactions);
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Admin: Get pending payments for verification
   */
  static async getPendingPayments(req: Request, res: Response) {
    try {
      const transactions = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.status, 'processing'));

      res.json(transactions);
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Admin: Approve or reject payment
   */
  static async processPayment(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

      await db.update(paymentTransactions)
        .set({ 
          status: action === 'approve' ? 'completed' : 'failed',
          processedAt: new Date()
        })
        .where(eq(paymentTransactions.id, parseInt(transactionId)));

      res.json({
        message: `Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Get payment instructions based on method
   */
  private static async getPaymentInstructions(paymentMethodId: number, amount: string, reference: string) {
    // This would fetch from payment_methods table and replace placeholders
    return {
      amount,
      reference,
      instructions: `Use reference: ${reference} and amount: ${amount} Kz`
    };
  }

  /**
   * Get status description in Portuguese
   */
  private static getStatusDescription(status: string) {
    const descriptions = {
      'pending': 'Pendente - Aguardando pagamento',
      'pending_verification': 'Aguardando verificação - Comprovante enviado',
      'completed': 'Concluído - Pagamento confirmado',
      'failed': 'Falhou - Pagamento rejeitado',
      'canceled': 'Cancelado'
    };
    return descriptions[status as keyof typeof descriptions] || status;
  }
}