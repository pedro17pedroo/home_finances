import { Request, Response } from 'express';
import { db } from '../../core/database/db';
import { appDownloads } from '../../core/database/schema';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'apps');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const platform = req.body.platform || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${platform}_${timestamp}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.apk', '.ipa', '.aab', '.png', '.jpg', '.jpeg', '.svg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos APK, IPA, AAB ou imagens (PNG, JPG, SVG, WEBP) são permitidos'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
});

/**
 * Get app download configuration for a specific platform
 */
export const getAppDownload = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        status: 'error',
        message: 'Plataforma inválida. Use "android" ou "ios"',
      });
    }

    const [config] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    if (!config) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuração não encontrada',
      });
    }

    res.json({
      status: 'success',
      data: config,
    });
  } catch (error) {
    console.error('Error getting app download:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar configuração',
    });
  }
};

/**
 * Get all app download configurations (public endpoint)
 */
export const getAllAppDownloads = async (req: Request, res: Response) => {
  try {
    const configs = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.isActive, true));

    res.json({
      status: 'success',
      data: configs,
    });
  } catch (error) {
    console.error('Error getting app downloads:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar configurações',
    });
  }
};

/**
 * Update app download configuration (admin only)
 */
export const updateAppDownload = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const {
      downloadType,
      storeUrl,
      version,
      buildNumber,
      releaseNotes,
      isActive,
    } = req.body;

    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        status: 'error',
        message: 'Plataforma inválida',
      });
    }

    if (!['direct', 'store'].includes(downloadType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tipo de download inválido. Use "direct" ou "store"',
      });
    }

    // Only validate storeUrl if the config is active and type is store
    if (isActive !== false && downloadType === 'store' && !storeUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'URL da loja é obrigatória para tipo "store"',
      });
    }

    const adminId = (req as any).admin?.id;

    // Check if config exists
    const [existing] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    const updateData: any = {
      downloadType,
      storeUrl: downloadType === 'store' ? storeUrl : null,
      version,
      buildNumber,
      releaseNotes,
      isActive: isActive !== undefined ? isActive : true,
      updatedBy: adminId,
      updatedAt: new Date(),
    };

    let result;
    if (existing) {
      // Update existing
      [result] = await db
        .update(appDownloads)
        .set(updateData)
        .where(eq(appDownloads.platform, platform))
        .returning();
    } else {
      // Insert new
      [result] = await db
        .insert(appDownloads)
        .values({
          platform,
          ...updateData,
        })
        .returning();
    }

    res.json({
      status: 'success',
      message: 'Configuração atualizada com sucesso',
      data: result,
    });
  } catch (error) {
    console.error('Error updating app download:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar configuração',
    });
  }
};

/**
 * Upload app file (APK/IPA) (admin only)
 */
export const uploadAppFile = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum arquivo foi enviado',
      });
    }

    if (!['android', 'ios'].includes(platform)) {
      // Delete uploaded file
      await fs.unlink(file.path);
      return res.status(400).json({
        status: 'error',
        message: 'Plataforma inválida',
      });
    }

    const {
      version,
      buildNumber,
      releaseNotes,
    } = req.body;

    const adminId = (req as any).admin?.id;

    // Generate file URL (relative to server)
    const fileUrl = `/uploads/apps/${file.filename}`;
    const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);

    // Check if config exists
    const [existing] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    // Delete old file if exists
    if (existing && existing.fileUrl) {
      const oldFilePath = path.join(process.cwd(), existing.fileUrl);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.log('Old file not found or already deleted');
      }
    }

    const updateData: any = {
      downloadType: 'direct',
      fileUrl,
      fileName: file.originalname,
      fileSize: `${fileSizeInMB} MB`,
      version,
      buildNumber,
      releaseNotes,
      storeUrl: null, // Clear store URL when uploading file
      isActive: true,
      updatedBy: adminId,
      updatedAt: new Date(),
    };

    let result;
    if (existing) {
      // Update existing
      [result] = await db
        .update(appDownloads)
        .set(updateData)
        .where(eq(appDownloads.platform, platform))
        .returning();
    } else {
      // Insert new
      [result] = await db
        .insert(appDownloads)
        .values({
          platform,
          ...updateData,
        })
        .returning();
    }

    res.json({
      status: 'success',
      message: 'Arquivo enviado com sucesso',
      data: result,
    });
  } catch (error) {
    console.error('Error uploading app file:', error);
    
    // Delete uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Erro ao fazer upload do arquivo',
    });
  }
};

/**
 * Delete app file (admin only)
 */
export const deleteAppFile = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const [existing] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuração não encontrada',
      });
    }

    // Delete file if exists
    if (existing.fileUrl) {
      const filePath = path.join(process.cwd(), existing.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.log('File not found or already deleted');
      }
    }

    // Update config to remove file info
    const adminId = (req as any).admin?.id;
    const [result] = await db
      .update(appDownloads)
      .set({
        downloadType: 'store',
        fileUrl: null,
        fileName: null,
        fileSize: null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(appDownloads.platform, platform))
      .returning();

    res.json({
      status: 'success',
      message: 'Arquivo deletado com sucesso',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting app file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao deletar arquivo',
    });
  }
};

/**
 * Upload store badge image (admin only)
 */
export const uploadStoreBadge = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum arquivo foi enviado',
      });
    }

    if (!['android', 'ios'].includes(platform)) {
      // Delete uploaded file
      await fs.unlink(file.path);
      return res.status(400).json({
        status: 'error',
        message: 'Plataforma inválida',
      });
    }

    const adminId = (req as any).admin?.id;

    // Generate file URL (relative to server)
    const badgeUrl = `/uploads/apps/${file.filename}`;

    // Check if config exists
    const [existing] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    // Delete old badge if exists
    if (existing && existing.storeBadgeUrl) {
      const oldFilePath = path.join(process.cwd(), existing.storeBadgeUrl);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.log('Old badge not found or already deleted');
      }
    }

    const updateData: any = {
      storeBadgeUrl: badgeUrl,
      updatedBy: adminId,
      updatedAt: new Date(),
    };

    let result;
    if (existing) {
      // Update existing
      [result] = await db
        .update(appDownloads)
        .set(updateData)
        .where(eq(appDownloads.platform, platform))
        .returning();
    } else {
      // Insert new with minimal data
      [result] = await db
        .insert(appDownloads)
        .values({
          platform,
          downloadType: 'store',
          ...updateData,
        })
        .returning();
    }

    res.json({
      status: 'success',
      message: 'Badge enviado com sucesso',
      data: result,
    });
  } catch (error) {
    console.error('Error uploading badge:', error);
    
    // Delete uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Erro ao fazer upload do badge',
    });
  }
};

/**
 * Delete store badge (admin only)
 */
export const deleteStoreBadge = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const [existing] = await db
      .select()
      .from(appDownloads)
      .where(eq(appDownloads.platform, platform))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuração não encontrada',
      });
    }

    // Delete badge if exists
    if (existing.storeBadgeUrl) {
      const filePath = path.join(process.cwd(), existing.storeBadgeUrl);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.log('Badge not found or already deleted');
      }
    }

    // Update config to remove badge
    const adminId = (req as any).admin?.id;
    const [result] = await db
      .update(appDownloads)
      .set({
        storeBadgeUrl: null,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(appDownloads.platform, platform))
      .returning();

    res.json({
      status: 'success',
      message: 'Badge deletado com sucesso',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting badge:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao deletar badge',
    });
  }
};
