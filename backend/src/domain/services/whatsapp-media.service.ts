import { promises as fs } from 'fs';
import path from 'path';
import { logger } from "../../core/utils/logger.js";

export class WhatsAppMediaService {
  private static readonly WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
  private static readonly ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  private static readonly UPLOAD_BASE_PATH = process.env.WHATSAPP_MEDIA_UPLOAD_PATH || 'uploads/receipts';
  private static readonly MAX_FILE_SIZE = parseInt(process.env.WHATSAPP_MAX_FILE_SIZE || '5242880'); // 5MB
  
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * Download media from WhatsApp Cloud API
   */
  static async downloadMedia(mediaId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename?: string;
    fileSize: number;
  }> {
    try {
      if (!this.ACCESS_TOKEN) {
        throw new Error('WhatsApp access token não configurado');
      }

      logger.info(`Baixando mídia WhatsApp: ${mediaId}`);

      // 1. Obter URL da mídia
      const mediaUrlResponse = await fetch(
        `${this.WHATSAPP_API_URL}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.ACCESS_TOKEN}`
          }
        }
      );

      if (!mediaUrlResponse.ok) {
        throw new Error(`Erro ao obter URL da mídia: ${mediaUrlResponse.statusText}`);
      }

      const mediaData = await mediaUrlResponse.json() as any;
      const { url, mime_type, file_size } = mediaData;

      // 2. Baixar conteúdo da mídia
      const mediaResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`
        }
      });

      if (!mediaResponse.ok) {
        throw new Error(`Erro ao baixar mídia: ${mediaResponse.statusText}`);
      }

      const buffer = Buffer.from(await mediaResponse.arrayBuffer());
      const mimeType = mime_type || mediaResponse.headers.get('content-type') || 'application/octet-stream';
      const fileSize = parseInt(file_size || buffer.length.toString());

      // Validar tipo de arquivo
      if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error(`Tipo de arquivo não suportado: ${mimeType}`);
      }

      // Validar tamanho do arquivo
      if (fileSize > this.MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande: ${fileSize} bytes (máximo: ${this.MAX_FILE_SIZE} bytes)`);
      }

      logger.info(`Mídia baixada com sucesso: ${mediaId} (${mimeType}, ${fileSize} bytes)`);

      return { buffer, mimeType, fileSize };

    } catch (error) {
      logger.error(`Erro ao baixar mídia ${mediaId}:`, error);
      throw error;
    }
  }

  /**
   * Save media file to disk
   */
  static async saveMediaFile(
    buffer: Buffer,
    mimeType: string,
    userId: number,
    originalFilename?: string
  ): Promise<{
    filePath: string;
    filename: string;
    relativePath: string;
  }> {
    try {
      const extension = this.getExtensionFromMimeType(mimeType);
      const timestamp = Date.now();
      const filename = originalFilename 
        ? `${timestamp}_${this.sanitizeFilename(originalFilename)}`
        : `receipt_${timestamp}.${extension}`;

      // Criar estrutura de diretórios: uploads/receipts/userId/YYYY/MM/
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      const userDir = path.join(this.UPLOAD_BASE_PATH, userId.toString(), year, month);
      const relativePath = path.join('receipts', userId.toString(), year, month, filename);
      const filePath = path.join(userDir, filename);

      // Garantir que o diretório existe
      await fs.mkdir(userDir, { recursive: true });

      // Salvar arquivo
      await fs.writeFile(filePath, buffer);

      logger.info(`Arquivo salvo: ${filePath} (${buffer.length} bytes)`);

      return {
        filePath,
        filename,
        relativePath
      };

    } catch (error) {
      logger.error('Erro ao salvar arquivo de mídia:', error);
      throw error;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt'
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Sanitize filename for safe storage
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limitar tamanho
  }

  /**
   * Check if media type is supported for expense receipts
   */
  static isSupportedReceiptType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType);
  }

  /**
   * Get human-readable file type description
   */
  static getFileTypeDescription(mimeType: string): string {
    const descriptions: Record<string, string> = {
      'image/jpeg': 'Imagem JPEG',
      'image/png': 'Imagem PNG',
      'application/pdf': 'Documento PDF',
      'application/msword': 'Documento Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documento Word',
      'text/plain': 'Arquivo de Texto'
    };

    return descriptions[mimeType] || 'Arquivo';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}