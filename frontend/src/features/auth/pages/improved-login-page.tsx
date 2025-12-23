import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Eye, EyeOff, Wallet, TrendingUp, PiggyBank, Shield, Loader2 } from 'lucide-react';
import { useLogin } from '../../../shared/hooks/use-auth';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import type { LoginRequest } from '../../../shared/types';

export function ImprovedLoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    emailOrPhone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loginMutation = useLogin();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      await loginMutation.mutateAsync(formData);
      window.location.href = '/dashboard';
    } catch (error: any) {
      setErrors({ 
        submit: error.response?.data?.message || 'Email/telefone ou senha incorretos' 
      });
    }
  };

  const features = [
    { icon: Wallet, text: 'Controle total das suas finanças' },
    { icon: TrendingUp, text: 'Relatórios e análises detalhadas' },
    { icon: PiggyBank, text: 'Metas de poupança inteligentes' },
    { icon: Shield, text: 'Segurança e privacidade garantidas' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-900 dark:to-gray-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <Link href="/landing">
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <span className="text-2xl">💰</span>
              </div>
              <span className="text-2xl font-bold text-white">FinanceControl</span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Gerencie suas finanças com inteligência
            </h1>
            <p className="text-blue-100 text-lg">
              A plataforma completa para controlar receitas, despesas e alcançar seus objetivos financeiros.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4 text-white/90">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5" />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-sm">
          © {new Date().getFullYear()} FinanceControl. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/landing">
              <div className="inline-flex items-center space-x-3 cursor-pointer">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">FinanceControl</span>
              </div>
            </Link>
          </div>

          {/* Back Button */}
          <Link href="/landing">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer mb-8">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar ao início</span>
            </div>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email ou Telefone
              </label>
              <Input
                id="emailOrPhone"
                name="emailOrPhone"
                type="text"
                value={formData.emailOrPhone}
                onChange={handleChange}
                placeholder="seu@email.com ou 923456789"
                className={`h-12 ${errors.emailOrPhone ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.emailOrPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.emailOrPhone}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`h-12 pr-12 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Lembrar-me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Esqueceu a senha?
              </Link>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{errors.submit}</p>
              </div>
            )}

            <Button 
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Novo por aqui?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link href="/onboarding">
            <Button 
              variant="outline" 
              className="w-full h-12 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 font-medium text-base transition-all"
            >
              Criar Conta Grátis
            </Button>
          </Link>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Termos de Uso</a>
            {' '}e{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
}
