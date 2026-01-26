import axios, { AxiosInstance } from 'axios';

export type PaymentMethod = 'ekwanza' | 'gpo' | 'ref';

export interface EKwanzaPaymentRequest {
  amount: number;
  referenceCode: string;
  mobileNumber: string;
}

export interface MulticaixaPaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'gpo' | 'ref';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  metadata: {
    gateway: string;
    method: string;
  };
  expiresIn: number;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  referenceCode?: string;
  status?: string;
  message?: string;
  data?: any;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentId?: string;
  amount?: number;
  paidAt?: string;
  data?: any;
}

class TPagamentoService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TPAGAMENTO_API_KEY || 'pk_test_ttb_sandbox_key';
    const baseURL = process.env.TPAGAMENTO_API_URL || 'https://tpagamento-backend.tatusolutions.com/api/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Generate unique reference code
  generateReferenceCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `REF-${timestamp}${random}`;
  }

  // E-Kwanza Payment
  async createEKwanzaPayment(
    amount: number,
    mobileNumber: string,
    referenceCode?: string
  ): Promise<PaymentResponse> {
    try {
      const code = referenceCode || this.generateReferenceCode();
      const cleanPhone = mobileNumber.replace(/\D/g, '').slice(-9);

      const response = await this.client.post('/ekwanza/payment-code', {
        amount,
        referenceCode: code,
        mobileNumber: cleanPhone,
      });

      return {
        success: true,
        paymentId: response.data.id || code,
        referenceCode: code,
        status: 'pending',
        data: response.data,
      };
    } catch (error: any) {
      console.error('E-Kwanza payment error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao processar pagamento E-Kwanza',
      };
    }
  }

  // Check E-Kwanza Payment Status
  async checkEKwanzaStatus(code: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.client.get(`/ekwanza/payment-status/${code}`);

      const statusMap: Record<string, PaymentStatusResponse['status']> = {
        pending: 'pending',
        paid: 'paid',
        completed: 'paid',
        failed: 'failed',
        expired: 'expired',
      };

      return {
        success: true,
        status: statusMap[response.data.status?.toLowerCase()] || 'pending',
        paymentId: response.data.id,
        amount: response.data.amount,
        paidAt: response.data.paidAt,
        data: response.data,
      };
    } catch (error: any) {
      console.error('E-Kwanza status check error:', error.response?.data || error.message);
      return {
        success: false,
        status: 'pending',
        data: error.response?.data,
      };
    }
  }

  // Multicaixa Express (GPO) Payment
  async createMulticaixaExpressPayment(
    amount: number,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    description?: string
  ): Promise<PaymentResponse> {
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '').slice(-9);

      const requestData = {
        amount,
        currency: 'AOA',
        paymentMethod: 'gpo',
        customerName,
        customerEmail,
        customerPhone: cleanPhone,
        description: description || 'Pagamento via Multicaixa Express',
        metadata: {
          gateway: 'appypay',
          method: 'gpo',
        },
        expiresIn: 30,
      };

      console.log('[TPagamento] Creating GPO payment:', requestData);

      const response = await this.client.post('/payments', requestData);

      console.log('[TPagamento] GPO payment response:', response.data);

      // Handle nested response structure: { success: true, data: { id, reference, ... } }
      const paymentData = response.data.data || response.data;
      
      // Check if payment failed
      if (paymentData.status === 'failed') {
        return {
          success: false,
          message: paymentData.message || 'Pagamento falhou. Por favor tente novamente.',
          paymentId: paymentData.id,
          referenceCode: paymentData.reference,
          status: 'failed',
          data: paymentData,
        };
      }
      
      return {
        success: true,
        paymentId: paymentData.id,
        referenceCode: paymentData.reference,
        status: paymentData.status === 'completed' ? 'paid' : 'pending',
        data: paymentData,
      };
    } catch (error: any) {
      console.error('Multicaixa Express payment error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao processar pagamento Multicaixa Express',
      };
    }
  }

  // Referência Multicaixa (REF) Payment
  async createReferenciaMulticaixaPayment(
    amount: number,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    description?: string
  ): Promise<PaymentResponse> {
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '').slice(-9);

      const requestData = {
        amount,
        currency: 'AOA',
        paymentMethod: 'ref',
        customerName,
        customerEmail,
        customerPhone: cleanPhone,
        description: description || 'Pagamento via Referência Multicaixa',
        metadata: {
          gateway: 'appypay',
          method: 'ref',
        },
        expiresIn: 60,
      };

      console.log('[TPagamento] Creating REF payment:', requestData);

      const response = await this.client.post('/payments', requestData);

      console.log('[TPagamento] REF payment response:', response.data);

      // Handle nested response structure: { success: true, data: { id, reference, ... } }
      const paymentData = response.data.data || response.data;

      // Check if payment failed
      if (paymentData.status === 'failed') {
        return {
          success: false,
          message: paymentData.message || 'Pagamento falhou. Por favor tente novamente.',
          paymentId: paymentData.id,
          referenceCode: paymentData.reference,
          status: 'failed',
          data: paymentData,
        };
      }

      return {
        success: true,
        paymentId: paymentData.id,
        referenceCode: paymentData.reference,
        status: paymentData.status === 'completed' ? 'paid' : 'pending',
        data: paymentData,
      };
    } catch (error: any) {
      console.error('Referência Multicaixa payment error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao processar pagamento Referência Multicaixa',
      };
    }
  }

  // Check Multicaixa/Referência Payment Status
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      console.log(`[TPagamento] Checking payment status for ID: ${paymentId}`);
      
      if (!paymentId || paymentId === 'null' || paymentId === 'undefined') {
        console.log('[TPagamento] Invalid payment ID provided');
        return {
          success: false,
          status: 'pending',
          data: { error: 'Invalid payment ID' },
        };
      }

      const response = await this.client.get(`/payments/${paymentId}`);

      console.log(`[TPagamento] Payment status response:`, response.data);

      // Handle nested response structure: { success: true, data: { status, ... } }
      const paymentData = response.data.data || response.data;

      const statusMap: Record<string, PaymentStatusResponse['status']> = {
        pending: 'pending',
        paid: 'paid',
        completed: 'paid',
        failed: 'failed',
        expired: 'expired',
      };

      const mappedStatus = statusMap[paymentData.status?.toLowerCase()] || 'pending';
      
      console.log(`[TPagamento] Status mapping: ${paymentData.status} -> ${mappedStatus}`);

      return {
        success: true,
        status: mappedStatus,
        paymentId: paymentData.id,
        amount: paymentData.amount,
        paidAt: paymentData.paidAt,
        data: paymentData,
      };
    } catch (error: any) {
      console.error('Payment status check error:', error.response?.data || error.message);
      return {
        success: false,
        status: 'pending',
        data: error.response?.data,
      };
    }
  }

  // Unified payment creation
  async createPayment(
    method: PaymentMethod,
    amount: number,
    customer: {
      name: string;
      email: string;
      phone: string;
    },
    description?: string
  ): Promise<PaymentResponse> {
    switch (method) {
      case 'ekwanza':
        return this.createEKwanzaPayment(amount, customer.phone);
      case 'gpo':
        return this.createMulticaixaExpressPayment(
          amount,
          customer.name,
          customer.email,
          customer.phone,
          description
        );
      case 'ref':
        return this.createReferenciaMulticaixaPayment(
          amount,
          customer.name,
          customer.email,
          customer.phone,
          description
        );
      default:
        return {
          success: false,
          message: 'Método de pagamento não suportado',
        };
    }
  }

  // Unified status check
  async getPaymentStatus(
    method: PaymentMethod,
    paymentIdOrCode: string
  ): Promise<PaymentStatusResponse> {
    if (method === 'ekwanza') {
      return this.checkEKwanzaStatus(paymentIdOrCode);
    }
    return this.checkPaymentStatus(paymentIdOrCode);
  }
}

export const tpagamentoService = new TPagamentoService();
export default tpagamentoService;
