import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password é obrigatório')
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Check if already logged in
  const { data: adminUser, isLoading } = useQuery({
    queryKey: ['/api/admin/auth/me'],
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro de login');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login efetuado com sucesso",
        description: `Bem-vindo, ${data.user.firstName || 'Admin'}!`
      });
      navigate('/admin/dashboard');
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  // Redirect if already logged in
  if (adminUser && !isLoading) {
    navigate('/admin/dashboard');
    return null;
  }

  const onSubmit = (data: LoginForm) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Painel Administrativo
          </CardTitle>
          <CardDescription>
            Faça login para acessar o sistema de administração
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@financecontrol.ao"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
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
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Credenciais padrão:</p>
            <p>Email: admin@financecontrol.ao</p>
            <p>Password: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}