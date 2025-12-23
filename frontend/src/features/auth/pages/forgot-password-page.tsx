import { useState } from 'react';
import { Link } from 'wouter';
import { Mail, Phone, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { apiClient } from '../../../shared/api/client';

type ResetMethod = 'email' | 'sms';

export function ForgotPasswordPage() {
  const [method, setMethod] = useState<ResetMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (method === 'email') {
        await apiClient.post('/auth/forgot-password/email', { email });
        setSuccess(true);
      } else {
        await apiClient.post('/auth/forgot-password/sms', { phone });
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao processar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/forgot-password/verify-code', { phone, code });
      if (response.data.token) {
        window.location.href = `/reset-password?token=${response.data.token}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Email Enviado!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Se o email existir na nossa base de dados, receberá instruções para redefinir a sua senha.
            </p>
            <Link href="/login">
              <Button className="w-full">Voltar ao Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao login
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Recuperar Senha
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {step === 'request' 
              ? 'Escolha como deseja recuperar a sua senha.'
              : 'Introduza o código que recebeu por SMS.'}
          </p>

          {step === 'request' && (
            <>
              {/* Method Selection */}
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                    method === 'email'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('sms')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-colors ${
                    method === 'sms'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  SMS
                </button>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-4">
                {method === 'email' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Telefone
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="923456789"
                      required
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A processar...
                    </>
                  ) : method === 'email' ? (
                    'Enviar Email de Recuperação'
                  ) : (
                    'Enviar Código SMS'
                  )}
                </Button>
              </form>
            </>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código de Verificação
                </label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Introduza o código de 6 dígitos enviado para {phone}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A verificar...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
