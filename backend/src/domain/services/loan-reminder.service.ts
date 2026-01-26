import { logger } from "../../core/utils/logger.js";
import { NotificationService } from "./notification.service.js";
import { db } from "../../core/database/db.js";
import { sql } from "drizzle-orm";
import { emailService } from "../../infrastructure/email/email.service.js";
import { smsService } from "../../infrastructure/sms/sms.service.js";

export interface SendReminderRequest {
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amount: string;
  dueDate: Date;
  customMessage?: string;
  senderName: string;
}

export class LoanReminderService {
  /**
   * Send a payment reminder for a loan
   */
  static async sendLoanReminder(
    loanId: number,
    userId: number,
    data: SendReminderRequest
  ): Promise<void> {
    try {
      const { recipientName, recipientEmail, recipientPhone, amount, dueDate, customMessage, senderName } = data;

      // Check if due date has passed
      const today = new Date();
      const isOverdue = dueDate < today;
      const daysOverdue = isOverdue 
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysUntilDue = !isOverdue
        ? Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Build message
      let message: string;
      
      if (customMessage) {
        message = customMessage;
      } else if (isOverdue) {
        message = `Olá ${recipientName},\n\n` +
          `Este é um lembrete sobre o empréstimo de ${this.formatCurrency(amount)} que venceu há ${daysOverdue} dia(s) (${this.formatDate(dueDate)}).\n\n` +
          `Por favor, entre em contato para regularizar a situação.\n\n` +
          `Atenciosamente,\n${senderName}`;
      } else {
        message = `Olá ${recipientName},\n\n` +
          `Este é um lembrete sobre o empréstimo de ${this.formatCurrency(amount)} com vencimento em ${daysUntilDue} dia(s) (${this.formatDate(dueDate)}).\n\n` +
          `Por favor, não se esqueça do pagamento.\n\n` +
          `Atenciosamente,\n${senderName}`;
      }

      const subject = isOverdue 
        ? `⚠️ Lembrete: Pagamento em Atraso - ${this.formatCurrency(amount)}`
        : `📅 Lembrete: Pagamento Próximo - ${this.formatCurrency(amount)}`;

      // Send email if provided
      if (recipientEmail) {
        try {
          await this.sendEmail(recipientEmail, subject, message);
          logger.info(`Email reminder sent to ${recipientEmail} for loan ${loanId}`);
        } catch (error) {
          logger.error(`Failed to send email reminder for loan ${loanId}:`, error);
          throw new Error('Erro ao enviar email');
        }
      }

      // Send SMS if provided
      if (recipientPhone) {
        try {
          await this.sendSMS(recipientPhone, message);
          logger.info(`SMS reminder sent to ${recipientPhone} for loan ${loanId}`);
        } catch (error) {
          logger.error(`Failed to send SMS reminder for loan ${loanId}:`, error);
          throw new Error('Erro ao enviar SMS');
        }
      }

      // Log the reminder in database (optional - for tracking)
      await db.execute(sql`
        INSERT INTO loan_reminders (loan_id, user_id, recipient_name, recipient_email, recipient_phone, amount, due_date, message, sent_at)
        VALUES (${loanId}, ${userId}, ${recipientName}, ${recipientEmail || null}, ${recipientPhone || null}, ${amount}, ${dueDate}, ${message}, NOW())
        ON CONFLICT DO NOTHING
      `).catch(() => {
        // Table might not exist yet, that's okay
        logger.warn('loan_reminders table not found, skipping log');
      });

      logger.info(`Loan reminder sent successfully for loan ${loanId}`);
    } catch (error) {
      logger.error(`Error sending loan reminder for loan ${loanId}:`, error);
      throw error;
    }
  }

  /**
   * Send a payment reminder for a debt
   */
  static async sendDebtReminder(
    debtId: number,
    userId: number,
    data: SendReminderRequest
  ): Promise<void> {
    try {
      const { recipientName, recipientEmail, recipientPhone, amount, dueDate, customMessage, senderName } = data;

      const today = new Date();
      const isOverdue = dueDate < today;
      const daysOverdue = isOverdue 
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysUntilDue = !isOverdue
        ? Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let message: string;
      
      if (customMessage) {
        message = customMessage;
      } else if (isOverdue) {
        message = `Olá ${recipientName},\n\n` +
          `Este é um lembrete sobre a dívida de ${this.formatCurrency(amount)} que venceu há ${daysOverdue} dia(s) (${this.formatDate(dueDate)}).\n\n` +
          `Por favor, entre em contato para regularizar a situação.\n\n` +
          `Atenciosamente,\n${senderName}`;
      } else {
        message = `Olá ${recipientName},\n\n` +
          `Este é um lembrete sobre a dívida de ${this.formatCurrency(amount)} com vencimento em ${daysUntilDue} dia(s) (${this.formatDate(dueDate)}).\n\n` +
          `Por favor, não se esqueça do pagamento.\n\n` +
          `Atenciosamente,\n${senderName}`;
      }

      const subject = isOverdue 
        ? `⚠️ Lembrete: Pagamento em Atraso - ${this.formatCurrency(amount)}`
        : `📅 Lembrete: Pagamento Próximo - ${this.formatCurrency(amount)}`;

      if (recipientEmail) {
        try {
          await this.sendEmail(recipientEmail, subject, message);
          logger.info(`Email reminder sent to ${recipientEmail} for debt ${debtId}`);
        } catch (error) {
          logger.error(`Failed to send email reminder for debt ${debtId}:`, error);
          throw new Error('Erro ao enviar email');
        }
      }

      if (recipientPhone) {
        try {
          await this.sendSMS(recipientPhone, message);
          logger.info(`SMS reminder sent to ${recipientPhone} for debt ${debtId}`);
        } catch (error) {
          logger.error(`Failed to send SMS reminder for debt ${debtId}:`, error);
          throw new Error('Erro ao enviar SMS');
        }
      }

      logger.info(`Debt reminder sent successfully for debt ${debtId}`);
    } catch (error) {
      logger.error(`Error sending debt reminder for debt ${debtId}:`, error);
      throw error;
    }
  }

  private static async sendEmail(to: string, subject: string, message: string): Promise<void> {
    try {
      // Converter mensagem de texto para HTML
      const htmlMessage = message.replace(/\n/g, '<br>');
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💰 FinanceControl</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="white-space: pre-line; line-height: 1.6; color: #374151;">
                ${htmlMessage}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} FinanceControl. Todos os direitos reservados.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 11px;">
                Este email foi enviado automaticamente. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const success = await emailService.sendEmail({
        to,
        subject,
        html,
        text: message
      });

      if (!success) {
        throw new Error('Falha ao enviar email');
      }

      logger.info(`Email reminder sent successfully to ${to}`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  private static async sendSMS(to: string, message: string): Promise<void> {
    try {
      // Formatar número de telefone
      const formattedPhone = smsService.formatPhoneNumber(to);
      
      // Validar número
      if (!smsService.isValidPhoneNumber(formattedPhone)) {
        throw new Error(`Número de telefone inválido: ${to}`);
      }

      // Limitar tamanho da mensagem SMS (160 caracteres padrão)
      let smsMessage = message;
      if (message.length > 160) {
        smsMessage = message.substring(0, 157) + '...';
      }

      const success = await smsService.sendSMS({
        to: formattedPhone,
        message: smsMessage
      });

      if (!success) {
        throw new Error('Falha ao enviar SMS');
      }

      logger.info(`SMS reminder sent successfully to ${formattedPhone}`);
    } catch (error) {
      logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }

  private static formatCurrency(amount: string | number): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }

  private static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }
}
