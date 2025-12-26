import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BadRequestError } from '../../core/errors/app-error.js';

const UPLOAD_BASE_PATH = 'uploads';
const LOGOS_PATH = path.join(UPLOAD_BASE_PATH, 'logos');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export class UploadService {
  /**
   * Ensure upload directories exist
   */
  static ensureDirectories() {
    if (!fs.existsSync(UPLOAD_BASE_PATH)) {
      fs.mkdirSync(UPLOAD_BASE_PATH, { recursive: true });
    }
    if (!fs.existsSync(LOGOS_PATH)) {
      fs.mkdirSync(LOGOS_PATH, { recursive: true });
    }
  }

  /**
   * Upload a logo image from base64 data
   */
  static async uploadLogo(base64Data: string, originalName?: string): Promise<string> {
    this.ensureDirectories();

    // Parse base64 data
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new BadRequestError('Formato de imagem inválido');
    }

    const mimeType = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestError(`Tipo de ficheiro não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestError(`Ficheiro muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const extension = this.getExtensionFromMimeType(mimeType);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const filename = `logo_${timestamp}_${uniqueId}.${extension}`;
    const filePath = path.join(LOGOS_PATH, filename);

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Return relative URL path
    return `/uploads/logos/${filename}`;
  }

  /**
   * Delete a logo file
   */
  static async deleteLogo(logoUrl: string): Promise<boolean> {
    if (!logoUrl || !logoUrl.startsWith('/uploads/logos/')) {
      return false;
    }

    const filename = path.basename(logoUrl);
    const filePath = path.join(LOGOS_PATH, filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
    }

    return false;
  }

  /**
   * Get file extension from mime type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    return mimeToExt[mimeType] || 'png';
  }
}
