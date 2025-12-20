import { UserRepository } from "../repositories/user.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { LoanRepository } from "../repositories/loan.repository.js";
import { DebtRepository } from "../repositories/debt.repository.js";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository.js";
import { TransactionService } from "./transaction.service.js";
import { WhatsAppMediaService } from "./whatsapp-media.service.js";
import { SimpleReceiptAIService } from "./receipt-ai-simple.service.js";
import { logger } from "../../core/utils/logger.js";

export interface WhatsAppMessage {
  from: string; // Número do WhatsApp
  body?: string; // Texto da mensagem (opcional para mensagens de mídia)
  timestamp: Date;
  // Suporte para mídia
  type?: 'text' | 'image' | 'document' | 'audio' | 'video';
  media?: {
    id: string;
    mime_type: string;
    sha256?: string;
    file_size?: string;
    caption?: string;
    filename?: string;
  };
}

export interface WhatsAppResponse {
  to: string;
  message: string;
  type?: 'text' | 'list' | 'buttons';
  options?: any;
}

export class WhatsAppBotService {
  private static userSessions = new Map<string, { userId?: number; step?: string; data?: any }>();

  /**
   * Processa mensagem recebida do WhatsApp
   */
  static async processMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const { from, body, type, media } = message;
    const phoneNumber = this.normalizePhoneNumber(from);
    
    try {
      logger.info(`WhatsApp message from ${phoneNumber}: ${body || 'media message'} (type: ${type || 'text'})`);

      // Verificar se usuário está autenticado
      const user = await UserRepository.findByPhone(phoneNumber);
      
      if (!user) {
        return this.handleUnregisteredUser(phoneNumber, body || '');
      }

      // Processar mensagens de mídia para registo de despesas
      if ((type === 'image' || type === 'document') && media) {
        return await this.handleMediaExpense(user.id, phoneNumber, media, body);
      }

      // Processar comandos de texto do usuário autenticado
      return await this.handleAuthenticatedUser(user.id, phoneNumber, body || '');

    } catch (error) {
      logger.error(`Erro no WhatsApp Bot para ${phoneNumber}:`, error);
      return {
        to: phoneNumber,
        message: "❌ Ocorreu um erro. Tente novamente mais tarde ou digite *ajuda* para ver os comandos disponíveis."
      };
    }
  }

  /**
   * Processar despesa com recibo (imagem ou documento)
   */
  private static async handleMediaExpense(
    userId: number,
    phoneNumber: string,
    media: any,
    caption?: string
  ): Promise<WhatsAppResponse> {
    try {
      // Verificar se o tipo de arquivo é suportado
      if (!WhatsAppMediaService.isSupportedReceiptType(media.mime_type)) {
        return {
          to: phoneNumber,
          message: `❌ *Tipo de arquivo não suportado!*\n\n✅ Envie:\n• Imagens (JPG, PNG)\n• Documentos (PDF, Word)\n\n💡 Tamanho máximo: 5MB para imagens, 100MB para documentos.`
        };
      }

      logger.info(`Processando recibo de ${phoneNumber}: ${media.mime_type}`);

      // Baixar e salvar mídia
      const { buffer, mimeType, fileSize } = await WhatsAppMediaService.downloadMedia(media.id);
      const { relativePath, filename } = await WhatsAppMediaService.saveMediaFile(
        buffer,
        mimeType,
        userId,
        media.filename
      );

      const fileTypeDesc = WhatsAppMediaService.getFileTypeDescription(mimeType);
      const fileSizeDesc = WhatsAppMediaService.formatFileSize(fileSize);

      // Verificar se a legenda contém informações da despesa
      if (caption && this.isExpenseCommand(caption)) {
        return await this.processExpenseWithReceipt(
          userId,
          phoneNumber,
          caption,
          relativePath,
          mimeType,
          filename,
          fileSize
        );
      }

      // 🤖 USAR IA PARA ANALISAR O RECIBO (apenas para imagens)
      let aiAnalysis = null;
      if (mimeType.startsWith('image/')) {
        try {
          logger.info(`Analisando recibo com IA para ${phoneNumber}`);
          aiAnalysis = await SimpleReceiptAIService.extractReceiptData(buffer, mimeType);
          
          // Se a IA tem alta confiança, processar automaticamente
          if (SimpleReceiptAIService.isHighConfidence(aiAnalysis) && aiAnalysis.amount) {
            const autoCommand = `despesa ${aiAnalysis.amount} ${aiAnalysis.category || 'outros'}`;
            
            return await this.processExpenseWithReceipt(
              userId,
              phoneNumber,
              autoCommand,
              relativePath,
              mimeType,
              filename,
              fileSize,
              aiAnalysis
            );
          }
        } catch (error) {
          logger.warn('Erro na análise IA do recibo:', error);
          // Continuar com fluxo manual se IA falhar
        }
      }

      // Armazenar mídia e dados da IA para uso posterior
      const session = this.userSessions.get(phoneNumber) || {};
      this.userSessions.set(phoneNumber, {
        ...session,
        userId,
        step: 'expense_with_receipt',
        data: {
          receiptPath: relativePath,
          receiptMimeType: mimeType,
          receiptOriginalName: filename,
          receiptFileSize: fileSize,
          aiAnalysis // Incluir análise da IA
        }
      });

      // Mensagem com sugestões da IA (se disponível)
      let message = `📎 *Recibo recebido!*\n\n📄 ${fileTypeDesc}\n💾 ${fileSizeDesc}\n\n`;
      
      if (aiAnalysis && aiAnalysis.amount) {
        message += `${SimpleReceiptAIService.formatExtractionMessage(aiAnalysis)}\n\n`;
        message += `✅ *Confirmar:* digite "ok" para aceitar\n`;
        message += `✏️ *Editar:* digite "valor categoria" (ex: 500 alimentacao)\n`;
        message += `❌ *Cancelar:* digite "cancelar"\n\n`;
        message += `💡 A IA sugeriu os dados acima. Confirme ou corrija conforme necessário.`;
      } else {
        message += `Agora me diga os detalhes da despesa:\n\n`;
        message += `💡 *Formato:* valor categoria\n`;
        message += `*Exemplo:* 500 alimentacao\n\n`;
        message += `Ou digite *cancelar* para cancelar.`;
      }

      return {
        to: phoneNumber,
        message
      };

    } catch (error: any) {
      logger.error('Erro ao processar mídia para despesa:', error);
      
      const errorMessage = error.message?.includes('não suportado')
        ? error.message
        : '❌ Erro ao processar o arquivo.\n\n💡 Certifique-se de que é uma imagem (JPG/PNG) ou documento (PDF) válido.';
      
      return {
        to: phoneNumber,
        message: errorMessage
      };
    }
  }

  /**
   * Verificar se o texto é um comando de despesa
   */
  private static isExpenseCommand(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    return lowerText.startsWith('despesa ') || 
           lowerText.startsWith('gasto ') || 
           lowerText.startsWith('saida ');
  }

  /**
   * Processar despesa com recibo anexado
   */
  private static async processExpenseWithReceipt(
    userId: number,
    phoneNumber: string,
    command: string,
    receiptPath: string,
    receiptMimeType: string,
    receiptOriginalName: string,
    receiptFileSize: number,
    aiAnalysis?: any
  ): Promise<WhatsAppResponse> {
    try {
      // Parse: "despesa 500 alimentacao" ou "gasto 200 transporte"
      const parts = command.split(' ');
      if (parts.length < 3) {
        return {
          to: phoneNumber,
          message: `❌ Formato incorreto!\n\n✅ Use: *despesa 500 alimentacao*\nOu: *gasto 200 transporte*`
        };
      }

      const amount = parseFloat(parts[1]);
      const category = parts.slice(2).join(' ');

      if (isNaN(amount) || amount <= 0) {
        return {
          to: phoneNumber,
          message: `❌ Valor inválido!\n\n✅ Use um número positivo: *despesa 500 alimentacao*`
        };
      }

      // Pegar primeira conta do usuário
      const accounts = await AccountRepository.findByUserId(userId);
      if (accounts.length === 0) {
        return {
          to: phoneNumber,
          message: `❌ Você precisa ter pelo menos uma conta cadastrada.\n\n💡 Acesse o app: financecontrol.ao`
        };
      }

      // Verificar saldo
      const currentBalance = parseFloat(accounts[0].balance);
      if (currentBalance < amount) {
        return {
          to: phoneNumber,
          message: `❌ *Saldo Insuficiente!*\n\n💳 Saldo atual: ${this.formatCurrency(currentBalance)}\n💸 Tentativa: ${this.formatCurrency(amount)}\n\n💡 Digite *saldo* para ver todas as contas.`
        };
      }

      // Gerar descrição baseada na IA (se disponível)
      let description = 'Registrado via WhatsApp com recibo';
      if (aiAnalysis) {
        description = SimpleReceiptAIService.generateDescription(aiAnalysis);
      }

      // Criar transação com recibo
      await TransactionService.createTransaction({
        accountId: accounts[0].id,
        amount,
        type: 'despesa',
        category: category || 'Outros',
        description,
        date: new Date().toISOString(),
        receiptPath,
        receiptMimeType,
        receiptOriginalName,
        receiptFileSize
      }, userId);

      const newBalance = currentBalance - amount;

      // Mensagem de confirmação com indicação de IA (se usada)
      let confirmationMessage = `✅ *Despesa Registrada com Recibo!*\n\n` +
        `📉 ${this.formatCurrency(amount)}\n` +
        `🏷️ ${category}\n` +
        `💳 ${accounts[0].name}\n` +
        `💰 Novo saldo: ${this.formatCurrency(newBalance)}\n` +
        `📎 Recibo anexado`;

      if (aiAnalysis && aiAnalysis.confidence > 0.5) {
        confirmationMessage += `\n🤖 Processado com IA (${Math.round(aiAnalysis.confidence * 100)}% confiança)`;
      }

      confirmationMessage += `\n\n💡 Digite *saldo* para ver o saldo atualizado.`;

      return {
        to: phoneNumber,
        message: confirmationMessage
      };

    } catch (error) {
      logger.error('Erro ao registrar despesa com recibo via WhatsApp:', error);
      return {
        to: phoneNumber,
        message: `❌ Erro ao registrar despesa.\n\n💡 Tente: *despesa 500 alimentacao*`
      };
    }
  }

  /**
   * Lidar com usuário não registrado
   */
  private static handleUnregisteredUser(phoneNumber: string, body: string): WhatsAppResponse {
    const command = body.toLowerCase().trim();

    if (command === 'registrar' || command === 'cadastrar') {
      this.userSessions.set(phoneNumber, { step: 'registration_name' });
      return {
        to: phoneNumber,
        message: `👋 Bem-vindo ao *FinanceControl*!\n\nPara começar, preciso de algumas informações:\n\n📝 *Qual é o seu nome completo?*`
      };
    }

    return {
      to: phoneNumber,
      message: `👋 Olá! Bem-vindo ao *FinanceControl*!\n\n🔐 Você ainda não está registrado.\n\nPara começar a usar o bot, digite:\n*registrar*\n\n💡 Ou acesse nosso site: financecontrol.ao`
    };
  }

  /**
   * Lidar com usuário autenticado
   */
  private static async handleAuthenticatedUser(userId: number, phoneNumber: string, body: string): Promise<WhatsAppResponse> {
    const command = body.toLowerCase().trim();

    // Verificar se usuário está numa sessão de despesa com recibo
    const session = this.userSessions.get(phoneNumber);
    if (session?.step === 'expense_with_receipt') {
      if (command === 'cancelar') {
        this.userSessions.delete(phoneNumber);
        return {
          to: phoneNumber,
          message: `❌ *Registo cancelado.*\n\nO recibo foi descartado. Digite *menu* para ver os comandos disponíveis.`
        };
      }

      const receiptData = session.data;
      
      // Se há análise da IA e usuário confirmou com "ok"
      if (command === 'ok' && receiptData.aiAnalysis?.amount) {
        const aiData = receiptData.aiAnalysis;
        const autoCommand = `despesa ${aiData.amount} ${aiData.category || 'outros'}`;
        
        const result = await this.processExpenseWithReceipt(
          userId,
          phoneNumber,
          autoCommand,
          receiptData.receiptPath,
          receiptData.receiptMimeType,
          receiptData.receiptOriginalName,
          receiptData.receiptFileSize,
          aiData
        );

        // Limpar sessão após processamento
        this.userSessions.delete(phoneNumber);
        return result;
      }

      // Processar despesa com dados manuais ou corrigidos
      const result = await this.processExpenseWithReceipt(
        userId,
        phoneNumber,
        `despesa ${body}`, // Adicionar prefixo para parsing
        receiptData.receiptPath,
        receiptData.receiptMimeType,
        receiptData.receiptOriginalName,
        receiptData.receiptFileSize,
        receiptData.aiAnalysis
      );

      // Limpar sessão após processamento
      this.userSessions.delete(phoneNumber);
      return result;
    }

    // Comandos principais
    if (command === 'menu' || command === 'ajuda' || command === '/start') {
      return this.getMainMenu(phoneNumber);
    }

    // Saldo
    if (command === 'saldo' || command === 'contas') {
      return await this.getAccountsBalance(userId, phoneNumber);
    }

    // Transações
    if (command === 'movimentos' || command === 'transacoes' || command === 'extrato') {
      return await this.getRecentTransactions(userId, phoneNumber);
    }

    // Registrar receita
    if (command.startsWith('receita ') || command.startsWith('entrada ')) {
      return await this.handleIncomeEntry(userId, phoneNumber, body);
    }

    // Registrar despesa
    if (command.startsWith('despesa ') || command.startsWith('gasto ') || command.startsWith('saida ')) {
      return await this.handleExpenseEntry(userId, phoneNumber, body);
    }

    // Empréstimos
    if (command === 'emprestimos' || command === 'loans') {
      return await this.getLoans(userId, phoneNumber);
    }

    // Dívidas
    if (command === 'dividas' || command === 'debts') {
      return await this.getDebts(userId, phoneNumber);
    }

    // Metas
    if (command === 'metas' || command === 'poupanca') {
      return await this.getSavingsGoals(userId, phoneNumber);
    }

    // Relatório
    if (command === 'relatorio' || command === 'resumo') {
      return await this.getFinancialSummary(userId, phoneNumber);
    }

    // Comando não reconhecido
    return {
      to: phoneNumber,
      message: `❓ Comando não reconhecido: "${body}"\n\nDigite *menu* para ver os comandos disponíveis.`
    };
  }

  /**
   * Menu principal
   */
  private static getMainMenu(phoneNumber: string): WhatsAppResponse {
    return {
      to: phoneNumber,
      message: `🏦 *FinanceControl - Menu Principal*\n\n` +
        `💰 *saldo* - Ver saldo das contas\n` +
        `📊 *movimentos* - Últimas transações\n` +
        `📈 *receita 1000 salario* - Registrar receita\n` +
        `📉 *despesa 500 alimentacao* - Registrar despesa\n` +
        `📎 *Envie foto/PDF* - Despesa com recibo\n` +
        `💸 *emprestimos* - Ver empréstimos\n` +
        `💳 *dividas* - Ver dívidas\n` +
        `🎯 *metas* - Ver metas de poupança\n` +
        `📋 *relatorio* - Resumo financeiro\n` +
        `❓ *ajuda* - Ver este menu\n\n` +
        `💡 *Novidade:* Envie foto do recibo ou PDF para registrar despesas com comprovante!`
    };
  }

  /**
   * Obter saldo das contas
   */
  private static async getAccountsBalance(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const accounts = await AccountRepository.findByUserId(userId);
    
    if (accounts.length === 0) {
      return {
        to: phoneNumber,
        message: `🏦 *Suas Contas*\n\n❌ Você ainda não tem contas cadastradas.\n\n💡 Acesse o app para adicionar suas contas: financecontrol.ao`
      };
    }

    let message = `🏦 *Suas Contas*\n\n`;
    let totalBalance = 0;

    accounts.forEach(account => {
      const balance = parseFloat(account.balance);
      totalBalance += balance;
      const icon = account.type === 'poupanca' ? '🏛️' : '💳';
      message += `${icon} *${account.name}*\n`;
      message += `   ${this.formatCurrency(balance)}\n\n`;
    });

    message += `💰 *Total Geral:* ${this.formatCurrency(totalBalance)}`;

    return { to: phoneNumber, message };
  }

  /**
   * Obter transações recentes
   */
  private static async getRecentTransactions(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const transactions = await TransactionRepository.findByUserId(userId);
    const recentTransactions = transactions.slice(0, 10);

    if (recentTransactions.length === 0) {
      return {
        to: phoneNumber,
        message: `📊 *Movimentos Recentes*\n\n❌ Nenhuma transação encontrada.\n\n💡 Use "receita 1000 salario" ou "despesa 500 comida" para registrar.`
      };
    }

    let message = `📊 *Últimos 10 Movimentos*\n\n`;

    recentTransactions.forEach(transaction => {
      const icon = transaction.type === 'receita' ? '📈' : '📉';
      const amount = parseFloat(transaction.amount);
      const date = new Date(transaction.date).toLocaleDateString('pt-BR');
      
      message += `${icon} *${this.formatCurrency(amount)}*\n`;
      message += `   ${transaction.category} - ${date}\n`;
      if (transaction.description) {
        message += `   "${transaction.description}"\n`;
      }
      message += `\n`;
    });

    return { to: phoneNumber, message };
  }

  /**
   * Registrar receita
   */
  private static async handleIncomeEntry(userId: number, phoneNumber: string, body: string): Promise<WhatsAppResponse> {
    try {
      // Parse: "receita 1000 salario" ou "entrada 500 freelance"
      const parts = body.split(' ');
      if (parts.length < 3) {
        return {
          to: phoneNumber,
          message: `❌ Formato incorreto!\n\n✅ Use: *receita 1000 salario*\nOu: *entrada 500 freelance*`
        };
      }

      const amount = parseFloat(parts[1]);
      const category = parts.slice(2).join(' ');

      if (isNaN(amount) || amount <= 0) {
        return {
          to: phoneNumber,
          message: `❌ Valor inválido!\n\n✅ Use um número positivo: *receita 1000 salario*`
        };
      }

      // Pegar primeira conta do usuário
      const accounts = await AccountRepository.findByUserId(userId);
      if (accounts.length === 0) {
        return {
          to: phoneNumber,
          message: `❌ Você precisa ter pelo menos uma conta cadastrada.\n\n💡 Acesse o app: financecontrol.ao`
        };
      }

      // Criar transação
      await TransactionService.createTransaction({
        accountId: accounts[0].id,
        amount,
        type: 'receita',
        category: category || 'Outros',
        description: `Registrado via WhatsApp`,
        date: new Date().toISOString()
      }, userId);

      return {
        to: phoneNumber,
        message: `✅ *Receita Registrada!*\n\n📈 ${this.formatCurrency(amount)}\n🏷️ ${category}\n💳 ${accounts[0].name}\n\n💡 Digite *saldo* para ver o novo saldo.`
      };

    } catch (error) {
      logger.error('Erro ao registrar receita via WhatsApp:', error);
      return {
        to: phoneNumber,
        message: `❌ Erro ao registrar receita.\n\n💡 Tente: *receita 1000 salario*`
      };
    }
  }

  /**
   * Registrar despesa
   */
  private static async handleExpenseEntry(userId: number, phoneNumber: string, body: string): Promise<WhatsAppResponse> {
    try {
      // Parse: "despesa 500 alimentacao" ou "gasto 200 transporte"
      const parts = body.split(' ');
      if (parts.length < 3) {
        return {
          to: phoneNumber,
          message: `❌ Formato incorreto!\n\n✅ Use: *despesa 500 alimentacao*\nOu: *gasto 200 transporte*`
        };
      }

      const amount = parseFloat(parts[1]);
      const category = parts.slice(2).join(' ');

      if (isNaN(amount) || amount <= 0) {
        return {
          to: phoneNumber,
          message: `❌ Valor inválido!\n\n✅ Use um número positivo: *despesa 500 comida*`
        };
      }

      // Pegar primeira conta do usuário
      const accounts = await AccountRepository.findByUserId(userId);
      if (accounts.length === 0) {
        return {
          to: phoneNumber,
          message: `❌ Você precisa ter pelo menos uma conta cadastrada.\n\n💡 Acesse o app: financecontrol.ao`
        };
      }

      // Verificar saldo
      const currentBalance = parseFloat(accounts[0].balance);
      if (currentBalance < amount) {
        return {
          to: phoneNumber,
          message: `❌ *Saldo Insuficiente!*\n\n💳 Saldo atual: ${this.formatCurrency(currentBalance)}\n💸 Tentativa: ${this.formatCurrency(amount)}\n\n💡 Digite *saldo* para ver todas as contas.`
        };
      }

      // Criar transação
      await TransactionService.createTransaction({
        accountId: accounts[0].id,
        amount,
        type: 'despesa',
        category: category || 'Outros',
        description: `Registrado via WhatsApp`,
        date: new Date().toISOString()
      }, userId);

      const newBalance = currentBalance - amount;

      return {
        to: phoneNumber,
        message: `✅ *Despesa Registrada!*\n\n📉 ${this.formatCurrency(amount)}\n🏷️ ${category}\n💳 ${accounts[0].name}\n💰 Novo saldo: ${this.formatCurrency(newBalance)}`
      };

    } catch (error) {
      logger.error('Erro ao registrar despesa via WhatsApp:', error);
      return {
        to: phoneNumber,
        message: `❌ Erro ao registrar despesa.\n\n💡 Tente: *despesa 500 alimentacao*`
      };
    }
  }

  /**
   * Obter empréstimos
   */
  private static async getLoans(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const loans = await LoanRepository.findByUserId(userId);
    const pendingLoans = loans.filter(loan => loan.status === 'pendente');

    if (pendingLoans.length === 0) {
      return {
        to: phoneNumber,
        message: `💰 *Seus Empréstimos*\n\n✅ Você não tem empréstimos pendentes.\n\n💡 Acesse o app para gerenciar empréstimos: financecontrol.ao`
      };
    }

    let message = `💰 *Empréstimos Pendentes*\n\n`;
    let totalAmount = 0;

    pendingLoans.forEach(loan => {
      const amount = parseFloat(loan.amount);
      totalAmount += amount;
      const dueDate = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';
      
      message += `👤 *${loan.borrower}*\n`;
      message += `💵 ${this.formatCurrency(amount)}\n`;
      message += `📅 Vence: ${dueDate}\n\n`;
    });

    message += `💰 *Total Emprestado:* ${this.formatCurrency(totalAmount)}`;

    return { to: phoneNumber, message };
  }

  /**
   * Obter dívidas
   */
  private static async getDebts(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const debts = await DebtRepository.findByUserId(userId);
    const pendingDebts = debts.filter(debt => debt.status === 'pendente');

    if (pendingDebts.length === 0) {
      return {
        to: phoneNumber,
        message: `💳 *Suas Dívidas*\n\n✅ Você não tem dívidas pendentes.\n\n💡 Acesse o app para gerenciar dívidas: financecontrol.ao`
      };
    }

    let message = `💳 *Dívidas Pendentes*\n\n`;
    let totalAmount = 0;

    pendingDebts.forEach(debt => {
      const amount = parseFloat(debt.amount);
      totalAmount += amount;
      const dueDate = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';
      const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date();
      
      message += `🏢 *${debt.creditor}*\n`;
      message += `💵 ${this.formatCurrency(amount)}\n`;
      message += `📅 Vence: ${dueDate}`;
      if (isOverdue) message += ` ⚠️ *ATRASADA*`;
      message += `\n\n`;
    });

    message += `💳 *Total Devido:* ${this.formatCurrency(totalAmount)}`;

    return { to: phoneNumber, message };
  }

  /**
   * Obter metas de poupança
   */
  private static async getSavingsGoals(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const goals = await SavingsGoalRepository.findByUserId(userId);
    const activeGoals = goals.filter(goal => goal.isActive);

    if (activeGoals.length === 0) {
      return {
        to: phoneNumber,
        message: `🎯 *Suas Metas*\n\n❌ Você não tem metas ativas.\n\n💡 Acesse o app para criar metas: financecontrol.ao`
      };
    }

    let message = `🎯 *Metas de Poupança*\n\n`;

    activeGoals.forEach(goal => {
      const current = parseFloat(goal.currentAmount);
      const target = parseFloat(goal.targetAmount);
      const progress = (current / target) * 100;
      const remaining = target - current;
      
      message += `🎯 *${goal.name}*\n`;
      message += `💰 ${this.formatCurrency(current)} / ${this.formatCurrency(target)}\n`;
      message += `📊 ${progress.toFixed(1)}% concluído\n`;
      message += `🎯 Faltam: ${this.formatCurrency(remaining)}\n\n`;
    });

    return { to: phoneNumber, message };
  }

  /**
   * Obter resumo financeiro
   */
  private static async getFinancialSummary(userId: number, phoneNumber: string): Promise<WhatsAppResponse> {
    const [accounts, transactions, loans, debts] = await Promise.all([
      AccountRepository.findByUserId(userId),
      TransactionRepository.findByUserId(userId),
      LoanRepository.findByUserId(userId),
      DebtRepository.findByUserId(userId)
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyTransactions = transactions.filter(t => new Date(t.date) >= thisMonth);
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const pendingLoans = loans.filter(l => l.status === 'pendente');
    const pendingDebts = debts.filter(d => d.status === 'pendente');
    
    const totalLoaned = pendingLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const totalOwed = pendingDebts.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    let message = `📋 *Resumo Financeiro*\n\n`;
    message += `💰 *Saldo Total:* ${this.formatCurrency(totalBalance)}\n\n`;
    message += `📊 *Este Mês:*\n`;
    message += `📈 Receitas: ${this.formatCurrency(monthlyIncome)}\n`;
    message += `📉 Despesas: ${this.formatCurrency(monthlyExpenses)}\n`;
    message += `💵 Saldo: ${this.formatCurrency(monthlyIncome - monthlyExpenses)}\n\n`;
    
    if (totalLoaned > 0) {
      message += `💰 *Empréstimos:* ${this.formatCurrency(totalLoaned)} (${pendingLoans.length})\n`;
    }
    
    if (totalOwed > 0) {
      message += `💳 *Dívidas:* ${this.formatCurrency(totalOwed)} (${pendingDebts.length})\n`;
    }

    return { to: phoneNumber, message };
  }

  /**
   * Utilitários
   */
  private static normalizePhoneNumber(phone: string): string {
    // Remove caracteres especiais e normaliza formato
    return phone.replace(/\D/g, '');
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value);
  }

  /**
   * Limpar sessões antigas (executar periodicamente)
   */
  static cleanOldSessions(): void {
    // Implementar limpeza de sessões antigas se necessário
    logger.info('Limpeza de sessões WhatsApp executada');
  }
}