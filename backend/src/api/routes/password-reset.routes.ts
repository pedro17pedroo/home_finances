import { Router } from 'express';
import passwordResetService from '../../domain/services/password-reset.service.js';

const router = Router();

/**
 * Request password reset via email
 * POST /api/auth/forgot-password/email
 */
router.post('/email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório.' });
    }

    const result = await passwordResetService.requestEmailReset(email);
    res.json(result);
  } catch (error: any) {
    console.error('Forgot password email error:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar pedido.' });
  }
});

/**
 * Request password reset via SMS
 * POST /api/auth/forgot-password/sms
 */
router.post('/sms', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Número de telefone é obrigatório.' });
    }

    const result = await passwordResetService.requestSMSReset(phone);
    res.json(result);
  } catch (error: any) {
    console.error('Forgot password SMS error:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar pedido.' });
  }
});

/**
 * Verify SMS code
 * POST /api/auth/forgot-password/verify-code
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Telefone e código são obrigatórios.' });
    }

    const result = await passwordResetService.verifySMSCode(phone, code);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Validate reset token
 * GET /api/auth/forgot-password/validate/:token
 */
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await passwordResetService.validateToken(token);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, valid: false });
  }
});

/**
 * Reset password
 * POST /api/auth/forgot-password/reset
 */
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const result = await passwordResetService.resetPassword(token, password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
