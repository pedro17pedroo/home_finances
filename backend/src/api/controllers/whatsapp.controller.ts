import { Request, Response, NextFunction } from "express";
import { WhatsAppBotService } from "../../domain/services/whatsapp-bot.service.js";
import { logger } from "../../core/utils/logger.js";

export class WhatsAppController {
  /**
   * Webhook para receber mensagens do WhatsApp
   */
  static async receiveMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, body, timestamp, type, image, document, audio, video } = req.body;

      if (!from) {
        return res.status(400).json({
          status: "error",
          message: "Número de origem obrigatório"
        });
      }

      // Processar mensagens de mídia
      let mediaInfo = null;
      let messageType = type || 'text';

      if (type === 'image' && image) {
        mediaInfo = {
          id: image.id,
          mime_type: image.mime_type,
          sha256: image.sha256,
          file_size: image.file_size,
          caption: image.caption
        };
      } else if (type === 'document' && document) {
        mediaInfo = {
          id: document.id,
          mime_type: document.mime_type,
          sha256: document.sha256,
          file_size: document.file_size,
          filename: document.filename,
          caption: document.caption
        };
      } else if (type === 'audio' && audio) {
        mediaInfo = {
          id: audio.id,
          mime_type: audio.mime_type,
          sha256: audio.sha256,
          file_size: audio.file_size
        };
      } else if (type === 'video' && video) {
        mediaInfo = {
          id: video.id,
          mime_type: video.mime_type,
          sha256: video.sha256,
          file_size: video.file_size,
          caption: video.caption
        };
      }

      // Processar mensagem
      const response = await WhatsAppBotService.processMessage({
        from,
        body: body || mediaInfo?.caption || '',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type: messageType,
        media: mediaInfo || undefined
      });

      // Aqui você enviaria a resposta de volta via WhatsApp API
      // Por agora, apenas logamos
      logger.info(`WhatsApp response to ${response.to}: ${response.message}`);

      res.json({
        status: "success",
        data: { response }
      });

    } catch (error) {
      logger.error("Erro no webhook WhatsApp:", error);
      next(error);
    }
  }

  /**
   * Verificação do webhook (para WhatsApp Business API)
   */
  static async verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verificar token (configurar no .env)
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'financecontrol_webhook_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('WhatsApp webhook verificado com sucesso');
      res.status(200).send(challenge);
    } else {
      logger.warn('Falha na verificação do webhook WhatsApp');
      res.status(403).send('Forbidden');
    }
  }

  /**
   * Enviar mensagem via WhatsApp (para testes)
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          status: "error",
          message: "Número de destino e mensagem são obrigatórios"
        });
      }

      // Aqui você implementaria o envio via WhatsApp API
      // Por agora, apenas simulamos
      logger.info(`Enviando mensagem WhatsApp para ${to}: ${message}`);

      res.json({
        status: "success",
        message: "Mensagem enviada com sucesso",
        data: { to, message }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Status do bot WhatsApp
   */
  static async getBotStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Verificar status do bot
      const status = {
        active: true,
        uptime: process.uptime(),
        lastMessage: new Date(),
        totalMessages: 0 // Implementar contador se necessário
      };

      res.json({
        status: "success",
        data: { botStatus: status }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Simular mensagem (para testes)
   */
  static async simulateMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, message } = req.body;

      if (!from || !message) {
        return res.status(400).json({
          status: "error",
          message: "Número e mensagem são obrigatórios"
        });
      }

      // Simular processamento de mensagem
      const response = await WhatsAppBotService.processMessage({
        from,
        body: message,
        timestamp: new Date()
      });

      res.json({
        status: "success",
        data: { 
          input: { from, message },
          response 
        }
      });

    } catch (error) {
      next(error);
    }
  }
}