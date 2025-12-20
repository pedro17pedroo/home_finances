import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../../../shared/hooks/use-auth';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import type { LoginRequest } from '../../../shared/types';

export function LoginPage() {
  const [formData, setFormData] = useState<LoginRequest>({
    emailOrPhone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loginMutation = useLogin();

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Link href="/landing">
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute left-0 top-0 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
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
              required
              value={formData.emailOrPhone}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {loginMutation.error && (
            <div className="text-red-600 text-sm">
              {(loginMutation.error as any)?.response?.data?.message || 'Erro ao fazer login'}
            </div>
          )}

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}