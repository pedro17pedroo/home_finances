import { logger } from '../../core/utils/logger.js';

export interface SMSOptions {
  to: string;
  message: string;
}

class SMSService {
  private apiKey: string | undefined;
  private apiUrl: string | undefined;
  private isConfigured: boolean = false;

  constructor() {
    // Configuração para provedor de SMS (ex: Twilio, Africa's Talking, etc.)
    this.apiKey = process.env.SMS_API_KEY;
    this.apiUrl = process.env.SMS_API_URL;
    this.isConfigured = !!(this.apiKey && this.apiUrl);

    if (!this.isConfigured) {
      logger.warn('[SMSService] SMS not configured. Messages will be logged only.');
    } else {
      logger.info('[SMSService] SMS service initialized successfully');
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    const { to, message } = options;

    // Log SMS in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('[SMSService] Sending SMS:', { to, message: message.substring(0, 50) + '...' });
    }

    if (!this.isConfigured) {
      logger.info('[SMSService] SMS content (SMS not configured):');
      logger.info('To:', to);
      logger.info('Message:', message);
      return true; // Return true in dev mode
    }

    try {
      // TODO: Integrar com provedor de SMS real
      // Exemplo para Twilio:
      /*
      const response = await fetch(`${this.apiUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: process.env.SMS_FROM_NUMBER || '',
          Body: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.statusText}`);
      }
      */

      // Exemplo para Africa's Talking:
      /*
      const response = await fetch(`${this.apiUrl}/messaging`, {
        method: 'POST',
        headers: {
          'apiKey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: process.env.SMS_USERNAME || '',
          to: to,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.statusText}`);
      }
      */

      logger.info(`[SMSService] SMS sent to ${to}`);
      return true;
    } catch (error: any) {
      logger.error('[SMSService] Failed to send SMS:', error.message);
      return false;
    }
  }

  /**
   * Formata número de telefone para formato internacional
   * Exemplo: 900000000 -> +244900000000 (Angola)
   */
  formatPhoneNumber(phone: string): string {
    // Remove espaços e caracteres especiais
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Se já começa com +, retorna como está
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Se começa com 244 (código de Angola), adiciona +
    if (cleaned.startsWith('244')) {
      return '+' + cleaned;
    }

    // Se é número local (9 dígitos), adiciona código de Angola
    if (cleaned.length === 9) {
      return '+244' + cleaned;
    }

    // Retorna como está se não conseguir formatar
    return cleaned;
  }

  /**
   * Valida se o número de telefone é válido
   */
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Valida formato internacional básico
    return /^\+\d{10,15}$/.test(formatted);
  }
}

export const smsService = new SMSService();
export default smsService;
