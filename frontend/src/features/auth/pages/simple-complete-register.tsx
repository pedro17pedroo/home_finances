import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRegister } from '../../../shared/hooks/use-auth';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import type { RegisterRequest } from '../../../shared/types';

export function SimpleCompleteRegisterPage() {
  // Get plan from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlan = urlParams.get('plan') || 'basic';

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    planType: selectedPlan as 'basic' | 'premium' | 'enterprise'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  // Plan information
  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case 'premium':
        return {
          name: 'Premium',
          price: '15.000 AOA/mês',
          color: 'from-blue-50 to-purple-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          features: [
            '10 contas bancárias',
            'Transações ilimitadas',
            'Relatórios avançados',
            'Notificações inteligentes',
            'Backup automático',
            'Suporte prioritário'
          ]
        };
      case 'enterprise':
        return {
          name: 'Enterprise',
          price: '50.000 AOA/mês',
          color: 'from-purple-50 to-indigo-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-900',
          features: [
            'Contas ilimitadas',
            'Transações ilimitadas',
            'Analytics avançados',
            'API personalizada',
            'Suporte 24/7',
            'Gestor de conta dedicado'
          ]
        };
      default: // basic
        return {
          name: 'Básico',
          price: 'Grátis',
          color: 'from-blue-50 to-green-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          features: [
            '3 contas bancárias',
            '100 transações/mês',
            'Relatórios básicos',
            'WhatsApp Bot com upload de recibos',
            'Suporte por email'
          ]
        };
    }
  };

  const planInfo = getPlanInfo(formData.planType || 'basic');

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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Nome é obrigatório';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Sobrenome é obrigatório';
    }
    if ((!formData.email || !formData.email.trim()) && (!formData.phone || !formData.phone.trim())) {
      newErrors.contact = 'Email ou telefone é obrigatório';
    }
    if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (formData.phone && formData.phone.trim() && !/^\d{9,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Telefone deve ter entre 9 e 15 dígitos';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      await registerMutation.mutateAsync(formData);
      // Redirect directly to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Erro ao criar conta' });
    }
  };

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
          <CardTitle className="text-2xl font-bold mt-8">Criar Conta</CardTitle>
          <CardDescription>
            Comece a controlar suas finanças hoje mesmo
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Sobrenome"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="941932755 ou +244941932755"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {errors.contact && <p className="text-red-500 text-sm">{errors.contact}</p>}

            <div>
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
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

            <div className={`bg-gradient-to-r ${planInfo.color} p-4 rounded-lg border ${planInfo.borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-medium ${planInfo.textColor} text-sm flex items-center gap-2`}>
                  🎉 Plano {planInfo.name} inclui:
                </h4>
                <span className={`font-bold ${planInfo.textColor} text-sm`}>
                  {planInfo.price}
                </span>
              </div>
              <ul className={`text-xs ${planInfo.textColor.replace('900', '700')} space-y-1`}>
                {planInfo.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    ✅ {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {formData.planType === 'basic' 
                      ? 'Comece grátis, atualize quando quiser'
                      : 'Você pode cancelar ou alterar seu plano a qualquer momento'
                    }
                  </p>
                  <Link href="/landing#pricing">
                    <button 
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Alterar plano
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}

            <Button 
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full"
            >
              {registerMutation.isPending 
                ? 'Criando conta...' 
                : formData.planType === 'basic' 
                  ? 'Criar Conta Grátis' 
                  : `Criar Conta - ${planInfo.name}`
              }
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}