import { useState, useEffect } from 'react';
import { Link, useSearch } from 'wouter';
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { apiClient } from '../../../shared/api/client';

export function ResetPasswordPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setIsValid(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await apiClient.get(`/auth/forgot-password/validate/${token}`);
      setIsValid(response.data.valid);
    } catch {
      setIsValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password/reset', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">A validar link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Link Inválido ou Expirado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Este link de recuperação de senha é inválido ou já expirou. Por favor, solicite um novo.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">Solicitar Novo Link</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Senha Alterada!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              A sua senha foi alterada com sucesso. Já pode iniciar sessão com a nova senha.
            </p>
            <Link href="/login">
              <Button className="w-full">Iniciar Sessão</Button>
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
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Criar Nova Senha
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            Introduza a sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nova Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Senha
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
