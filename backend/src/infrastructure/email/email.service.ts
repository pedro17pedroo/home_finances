import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM || 'noreply@financecontrol.ao';
    this.fromName = process.env.SMTP_FROM_NAME || 'FinanceControl';
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[EmailService] SMTP not configured. Emails will be logged only.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    // Verify connection
    this.transporter.verify((error: Error | null) => {
      if (error) {
        console.error('[EmailService] SMTP connection error:', error.message);
      } else {
        console.log('[EmailService] SMTP connected successfully');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    // Log email in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[EmailService] Sending email:', { to, subject });
    }

    if (!this.transporter) {
      console.log('[EmailService] Email content (SMTP not configured):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      return true; // Return true in dev mode
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
      });
      console.log(`[EmailService] Email sent to ${to}`);
      return true;
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error.message);
      return false;
    }
  }

  private htmlToText(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // ============ EMAIL TEMPLATES ============

  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    const html = this.getEmailTemplate('Bem-vindo ao FinanceControl!', `
      <h2>Olá ${firstName}!</h2>
      <p>Bem-vindo ao <strong>FinanceControl</strong> - a sua plataforma de gestão financeira pessoal.</p>
      <p>A sua conta foi criada com sucesso. Agora pode:</p>
      <ul>
        <li>📊 Acompanhar as suas receitas e despesas</li>
        <li>🏦 Gerir múltiplas contas bancárias</li>
        <li>🎯 Definir metas de poupança</li>
        <li>📈 Visualizar relatórios detalhados</li>
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Aceder ao Dashboard
        </a>
      </p>
      <p style="margin-top: 30px; color: #666;">
        Se tiver alguma dúvida, não hesite em contactar-nos.
      </p>
    `);

    return this.sendEmail({ to, subject: 'Bem-vindo ao FinanceControl! 🎉', html });
  }

  async sendTeamInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    token: string,
    role: string
  ): Promise<boolean> {
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`;
    const roleLabel = role === 'admin' ? 'Administrador' : 'Membro';

    const html = this.getEmailTemplate('Convite para Equipa', `
      <h2>Você foi convidado!</h2>
      <p><strong>${inviterName}</strong> convidou-o para se juntar à equipa <strong>${organizationName}</strong> no FinanceControl.</p>
      <p>Função: <strong>${roleLabel}</strong></p>
      <p>Clique no botão abaixo para aceitar o convite e criar a sua conta:</p>
      <p style="margin-top: 30px;">
        <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Aceitar Convite
        </a>
      </p>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Este convite expira em 7 dias.
      </p>
      <p style="color: #999; font-size: 12px;">
        Se não reconhece este convite, pode ignorar este email.
      </p>
    `);

    return this.sendEmail({ to, subject: `Convite para ${organizationName} - FinanceControl`, html });
  }

  async sendSubscriptionConfirmationEmail(
    to: string,
    firstName: string,
    planName: string,
    price: number,
    endDate: Date | null
  ): Promise<boolean> {
    const formattedPrice = new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
    }).format(price) + ' Kz';

    const endDateStr = endDate 
      ? new Date(endDate).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Sem data de expiração';

    const html = this.getEmailTemplate('Assinatura Confirmada', `
      <h2>Obrigado pela sua assinatura, ${firstName}!</h2>
      <p>A sua assinatura do plano <strong>${planName}</strong> foi confirmada com sucesso.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Plano:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Valor:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formattedPrice}/mês</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Válido até:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${endDateStr}</td>
          </tr>
        </table>
      </div>
      <p>Agora tem acesso a todas as funcionalidades do plano ${planName}.</p>
      <p style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/subscription" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver Assinatura
        </a>
      </p>
    `);

    return this.sendEmail({ to, subject: `Assinatura ${planName} Confirmada - FinanceControl`, html });
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = this.getEmailTemplate('Recuperação de Senha', `
      <h2>Olá ${firstName},</h2>
      <p>Recebemos um pedido para redefinir a senha da sua conta FinanceControl.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <p style="margin-top: 30px;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Redefinir Senha
        </a>
      </p>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Este link expira em 1 hora.
      </p>
      <p style="color: #999; font-size: 12px;">
        Se não solicitou a redefinição de senha, pode ignorar este email. A sua senha permanecerá inalterada.
      </p>
    `);

    return this.sendEmail({ to, subject: 'Redefinir Senha - FinanceControl', html });
  }

  async sendPasswordResetCodeSMS(phone: string, code: string): Promise<boolean> {
    // TODO: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
    console.log(`[EmailService] SMS Code for ${phone}: ${code}`);
    
    // For now, just log the code
    // In production, integrate with SMS API
    return true;
  }

  async sendPasswordChangedEmail(to: string, firstName: string): Promise<boolean> {
    const html = this.getEmailTemplate('Senha Alterada', `
      <h2>Olá ${firstName},</h2>
      <p>A sua senha foi alterada com sucesso.</p>
      <p>Se não foi você que fez esta alteração, contacte-nos imediatamente.</p>
      <p style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Iniciar Sessão
        </a>
      </p>
    `);

    return this.sendEmail({ to, subject: 'Senha Alterada - FinanceControl', html });
  }

  async sendTrialEndingEmail(to: string, firstName: string, daysRemaining: number): Promise<boolean> {
    const html = this.getEmailTemplate('Período de Teste a Terminar', `
      <h2>Olá ${firstName},</h2>
      <p>O seu período de teste no FinanceControl termina em <strong>${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}</strong>.</p>
      <p>Para continuar a usar todas as funcionalidades, faça upgrade para um plano pago:</p>
      <p style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/subscription?tab=planos" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver Planos
        </a>
      </p>
    `);

    return this.sendEmail({ to, subject: `Período de Teste Termina em ${daysRemaining} Dias - FinanceControl`, html });
  }

  private getEmailTemplate(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
              ${content}
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
  }
}

export const emailService = new EmailService();
export default emailService;
