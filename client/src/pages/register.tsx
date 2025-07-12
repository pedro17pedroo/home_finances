import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { registerSchema } from '@shared/schema';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, CheckCircle } from 'lucide-react';

type RegisterFormData = z.infer<typeof registerSchema>;

const plans = [
  {
    id: 'basic',
    name: 'Básico',
    price: 'R$ 29',
    period: '/mês',
    description: 'Perfeito para uso pessoal',
    features: [
      'Até 5 contas bancárias',
      '1.000 transações/mês',
      'Relatórios básicos',
      'Metas de poupança',
      'Suporte por email'
    ],
    highlight: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 59',
    period: '/mês',
    description: 'Ideal para famílias e pequenos negócios',
    features: [
      'Contas bancárias ilimitadas',
      'Transações ilimitadas',
      'Relatórios avançados',
      'Controle de empréstimos',
      'Gestão de dívidas',
      'Suporte prioritário'
    ],
    highlight: true
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    price: 'R$ 149',
    period: '/mês',
    description: 'Para empresas e contadores',
    features: [
      'Tudo do Premium',
      'Múltiplos usuários',
      'API personalizada',
      'Integração com bancos',
      'Suporte dedicado'
    ],
    highlight: false
  }
];

export default function Register() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      phone: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar conta');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você será redirecionado para o painel.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    const dataWithPlan = { ...data, planType: selectedPlan };
    registerMutation.mutate(dataWithPlan);
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    setStep('form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">FinanceControl</h1>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {step === 'plan' ? 'Escolha seu plano' : 'Crie sua conta'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {step === 'plan' 
              ? 'Comece com 14 dias grátis. Cancele a qualquer momento.'
              : `Finalize seu cadastro no plano ${plans.find(p => p.id === selectedPlan)?.name}`
            }
          </p>
        </div>

        {/* Plan Selection */}
        {step === 'plan' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`cursor-pointer transition-all relative hover:shadow-lg ${
                  plan.highlight ? 'scale-105 ring-2 ring-blue-200' : ''
                }`}
                onClick={() => handlePlanSelection(plan.id)}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                    Escolher {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Registration Form */}
        {step === 'form' && (
          <div className="max-w-md mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => setStep('plan')} 
              className="mb-4"
            >
              ← Voltar aos planos
            </Button>
            <Card>
            <CardHeader>
              <CardTitle>Criar Conta</CardTitle>
              <CardDescription>
                Plano selecionado: <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu sobrenome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(11) 99999-9999"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Criando conta...' : 'Criar conta e começar teste grátis'}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Fazer login
                  </Link>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Ao criar uma conta, você concorda com nossos{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700">Termos de Serviço</a>{' '}
                  e{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700">Política de Privacidade</a>
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}