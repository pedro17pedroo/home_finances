import { Request, Response } from 'express';
import { db } from '../db';
import { paymentTransactions, paymentConfirmations, plans } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { SubscriptionService } from '../services/subscriptionService';
import { nanoid } from 'nanoid';

export class PaymentController {
  /**
   * Initiate payment process
   */
  static async initiatePayment(req: Request, res: Response) {
    try {
      const { planId, paymentMethodId } = req.body;
      const userId = req.user.id;

      // Get plan details
      const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Generate unique reference
      const reference = `PAY-${nanoid(10).toUpperCase()}`;

      // Create payment transaction
      const [transaction] = await db.insert(paymentTransactions).values({
        userId,
        planId,
        paymentMethodId,
        amount: plan.price,
        currency: 'AOA',
        reference,
        status: 'pending',
        metadata: {
          planName: plan.name,
          planType: plan.type
        }
      }).returning();

      res.json({
        transactionId: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        plan: {
          id: plan.id,
          name: plan.name,
          type: plan.type
        },
        paymentMethodId,
        instructions: await this.getPaymentInstructions(paymentMethodId, transaction.amount, reference)
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
      const { notes } = req.body;
      const file = req.files?.receipt;

      if (!file) {
        return res.status(400).json({ message: "Receipt file is required" });
      }

      // Verify transaction belongs to user
      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(and(
          eq(paymentTransactions.id, parseInt(transactionId)),
          eq(paymentTransactions.userId, req.user.id)
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

      await (file as any).mv(filePath);

      // Create confirmation record
      const [confirmation] = await db.insert(paymentConfirmations).values({
        transactionId: parseInt(transactionId),
        userId: req.user.id,
        receiptPath: filePath,
        receiptOriginalName: file.name as string,
        notes,
        status: 'pending_verification'
      }).returning();

      // Update transaction status
      await db.update(paymentTransactions)
        .set({ 
          status: 'pending_verification',
          updatedAt: new Date()
        })
        .where(eq(paymentTransactions.id, parseInt(transactionId)));

      res.json({
        message: "Receipt uploaded successfully",
        confirmationId: confirmation.id,
        status: "pending_verification",
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

      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(and(
          eq(paymentTransactions.id, parseInt(transactionId)),
          eq(paymentTransactions.userId, req.user.id)
        ));

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Get confirmation if exists
      const [confirmation] = await db.select()
        .from(paymentConfirmations)
        .where(eq(paymentConfirmations.transactionId, parseInt(transactionId)));

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
      const transactions = await db.select({
        id: paymentTransactions.id,
        amount: paymentTransactions.amount,
        currency: paymentTransactions.currency,
        reference: paymentTransactions.reference,
        status: paymentTransactions.status,
        paymentMethodId: paymentTransactions.paymentMethodId,
        metadata: paymentTransactions.metadata,
        createdAt: paymentTransactions.createdAt,
        confirmedAt: paymentTransactions.confirmedAt
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, req.user.id))
      .orderBy(paymentTransactions.createdAt);

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
      const pendingPayments = await db.select({
        transactionId: paymentTransactions.id,
        userId: paymentTransactions.userId,
        amount: paymentTransactions.amount,
        reference: paymentTransactions.reference,
        paymentMethodId: paymentTransactions.paymentMethodId,
        metadata: paymentTransactions.metadata,
        createdAt: paymentTransactions.createdAt,
        confirmationId: paymentConfirmations.id,
        receiptPath: paymentConfirmations.receiptPath,
        receiptOriginalName: paymentConfirmations.receiptOriginalName,
        notes: paymentConfirmations.notes,
        confirmationStatus: paymentConfirmations.status
      })
      .from(paymentTransactions)
      .leftJoin(paymentConfirmations, eq(paymentConfirmations.transactionId, paymentTransactions.id))
      .where(eq(paymentTransactions.status, 'pending_verification'))
      .orderBy(paymentTransactions.createdAt);

      res.json(pendingPayments);
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
      const { action, adminNotes } = req.body; // action: 'approve' | 'reject'

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, parseInt(transactionId)));

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (action === 'approve') {
        // Update transaction status
        await db.update(paymentTransactions)
          .set({ 
            status: 'completed',
            confirmedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(paymentTransactions.id, parseInt(transactionId)));

        // Update confirmation
        await db.update(paymentConfirmations)
          .set({ 
            status: 'approved',
            adminNotes,
            verifiedAt: new Date(),
            verifiedBy: req.admin.id
          })
          .where(eq(paymentConfirmations.transactionId, parseInt(transactionId)));

        // Activate subscription
        const [plan] = await db.select().from(plans).where(eq(plans.id, transaction.planId));
        if (plan) {
          await SubscriptionService.activateSubscription(
            transaction.userId, 
            plan.type as any, 
            1 // 1 month
          );
        }

        res.json({ 
          message: "Payment approved and subscription activated",
          transactionId: parseInt(transactionId)
        });
      } else {
        // Reject payment
        await db.update(paymentTransactions)
          .set({ 
            status: 'failed',
            updatedAt: new Date()
          })
          .where(eq(paymentTransactions.id, parseInt(transactionId)));

        await db.update(paymentConfirmations)
          .set({ 
            status: 'rejected',
            adminNotes,
            verifiedAt: new Date(),
            verifiedBy: req.admin.id
          })
          .where(eq(paymentConfirmations.transactionId, parseInt(transactionId)));

        res.json({ 
          message: "Payment rejected",
          transactionId: parseInt(transactionId)
        });
      }
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