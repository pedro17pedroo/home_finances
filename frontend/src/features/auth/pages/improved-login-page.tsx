import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../../../shared/hooks/use-auth';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { showInfo } from '../../../shared/lib/alerts';
import type { LoginRequest } from '../../../shared/types';

export function ImprovedLoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    emailOrPhone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const loginMutation = useLogin();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    try {
      await loginMutation.mutateAsync(formData);
      // Redirect will be handled by the auth context
      window.location.href = '/dashboard';
    } catch (error: any) {
      setErrors({ 
        submit: error.response?.data?.message || 'Email/telefone ou senha incorretos' 
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Digite seu email ou telefone primeiro' });
      return;
    }

    try {
      // Simulate forgot password request
      await showInfo('Instruções Enviadas', `Instruções de redefinição de senha foram enviadas para: ${formData.emailOrPhone}`);
      setShowForgotPassword(false);
    } catch (error) {
      setErrors({ submit: 'Erro ao enviar instruções de redefinição' });
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center relative">
            <div 
              className="absolute left-0 top-0 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              onClick={() => setShowForgotPassword(false)}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar</span>
            </div>
            <CardTitle className="text-2xl font-bold mt-8">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite seu email ou telefone para receber instruções
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="emailOrPhone">Email ou Telefone</Label>
                <Input
                  id="emailOrPhone"
                  name="emailOrPhone"
                  type="text"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  placeholder="seu@email.com ou 941932755"
                  className={errors.emailOrPhone ? 'border-red-500' : ''}
                />
                {errors.emailOrPhone && <p className="text-red-500 text-sm mt-1">{errors.emailOrPhone}</p>}
              </div>

              {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}

              <Button type="submit" className="w-full">
                Enviar Instruções
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Link href="/landing">
            <div className="absolute left-0 top-0 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar</span>
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold mt-8">Entrar na sua conta</CardTitle>
          <CardDescription>
            Acesse sua conta para gerenciar suas finanças
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="emailOrPhone">Email ou Telefone</Label>
              <Input
                id="emailOrPhone"
                name="emailOrPhone"
                type="text"
                value={formData.emailOrPhone}
                onChange={handleChange}
                placeholder="seu@email.com ou 941932755"
                className={errors.emailOrPhone ? 'border-red-500' : ''}
              />
              {errors.emailOrPhone && <p className="text-red-500 text-sm mt-1">{errors.emailOrPhone}</p>}
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Sua senha"
                  className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}

            <Button 
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">Não tem uma conta?</p>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}