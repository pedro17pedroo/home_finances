import crypto from 'crypto';
import { db } from '../../core/database/db.js';
import { passwordResetTokens, users } from '../../core/database/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '../../api/middlewares/auth.js';
import emailService from '../../infrastructure/email/email.service.js';
import { NotFoundError, BadRequestError } from '../../core/errors/app-error.js';

class PasswordResetService {
  private readonly TOKEN_EXPIRY_HOURS = 1;
  private readonly CODE_EXPIRY_MINUTES = 10;

  /**
   * Request password reset via email
   */
  async requestEmailReset(email: string): Promise<{ success: boolean; message: string }> {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: 'Se o email existir, receberá instruções de recuperação.' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Create new token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      type: 'email',
      expiresAt,
    });

    // Send email
    await emailService.sendPasswordResetEmail(
      user.email!,
      user.firstName || 'Utilizador',
      token
    );

    return { success: true, message: 'Se o email existir, receberá instruções de recuperação.' };
  }

  /**
   * Request password reset via SMS
   */
  async requestSMSReset(phone: string): Promise<{ success: boolean; message: string; token?: string }> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));

    if (!user) {
      return { success: true, message: 'Se o número existir, receberá um código de verificação.' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Create new token with code
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      code,
      type: 'sms',
      expiresAt,
    });

    // Send SMS
    await emailService.sendPasswordResetCodeSMS(phone, code);

    return { 
      success: true, 
      message: 'Se o número existir, receberá um código de verificação.',
      token // Return token for verification step
    };
  }

  /**
   * Verify SMS code and get reset token
   */
  async verifySMSCode(phone: string, code: string): Promise<{ success: boolean; token?: string; message: string }> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));

    if (!user) {
      throw new BadRequestError('Código inválido ou expirado.');
    }

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.code, code),
          eq(passwordResetTokens.type, 'sms'),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );

    if (!resetToken || resetToken.usedAt) {
      throw new BadRequestError('Código inválido ou expirado.');
    }

    return { success: true, token: resetToken.token, message: 'Código verificado com sucesso.' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );

    if (!resetToken || resetToken.usedAt) {
      throw new BadRequestError('Link de recuperação inválido ou expirado.');
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, resetToken.userId));
    if (!user) {
      throw new NotFoundError('Utilizador');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    // Mark token as used
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));

    // Send confirmation email
    if (user.email) {
      await emailService.sendPasswordChangedEmail(user.email, user.firstName || 'Utilizador');
    }

    return { success: true, message: 'Senha alterada com sucesso.' };
  }

  /**
   * Validate token (for frontend to check if token is valid)
   */
  async validateToken(token: string): Promise<{ valid: boolean; type?: string }> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );

    if (!resetToken || resetToken.usedAt) {
      return { valid: false };
    }

    return { valid: true, type: resetToken.type };
  }
}

export const passwordResetService = new PasswordResetService();
export default passwordResetService;
