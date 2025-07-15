import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Shield, Target, CreditCard, PieChart, DollarSign, BarChart3, Users, Star, ArrowRight, Play, Smartphone } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch plans from database
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/plans'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Show loading while checking authentication or loading plans
  if (isLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is authenticated, don't show landing page content
  if (user) {
    return null;
  }

  // Transform database plans into landing page format
  const plans = plansData?.reduce((acc: any, plan: any) => {
    const descriptions = {
      basic: 'Perfeito para uso pessoal',
      premium: 'Ideal para famílias e pequenos negócios',
      enterprise: 'Para empresas e contadores'
    };
    
    // Convert features to array format (handles both object and array formats)
    let featuresArray: string[] = [];
    
    if (Array.isArray(plan.features)) {
      // Features are already in array format (old format)
      featuresArray = plan.features;
    } else if (plan.features && typeof plan.features === 'object') {
      // Features are in object format (new format from admin panel)
      featuresArray = Object.entries(plan.features)
        .filter(([key, value]) => value === true)
        .map(([key, value]) => {
          // Map feature keys to user-friendly names
          const featureNames = {
            dashboard: 'Dashboard Completo',
            transactions: 'Gestão de Transações',
            accounts: 'Múltiplas Contas',
            savingsGoals: 'Objetivos de Poupança',
            loans: 'Gestão de Empréstimos',
            debts: 'Gestão de Dívidas',
            reports: 'Relatórios Detalhados',
            analytics: 'Análise Avançada',
            teamManagement: 'Gestão de Equipe',
            apiAccess: 'Acesso à API',
            prioritySupport: 'Suporte Prioritário',
            customization: 'Personalização Avançada',
            backup: 'Backup Automático',
            sso: 'Single Sign-On',
            whiteLabel: 'Marca Branca'
          };
          return featureNames[key as keyof typeof featureNames] || key;
        });
    } else {
      // Fallback to empty array if features is not defined
      featuresArray = [];
    }
    
    const formattedPlan = {
      name: plan.name,
      price: `${parseFloat(plan.price).toLocaleString('pt-AO')} Kz`,
      period: '/mês',
      description: descriptions[plan.type as keyof typeof descriptions] || plan.description,
      features: featuresArray,
      buttonText: plan.type === 'premium' ? 'Mais Popular' : 
                  plan.type === 'enterprise' ? 'Selecionar Plano' : 'Começar Grátis',
      highlight: plan.type === 'premium'
    };
    acc[plan.type] = formattedPlan;
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">FinanceControl</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Preços</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Depoimentos</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/register?plan=premium">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            🚀 Novo: Integração com bancos angolanos
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Controle suas <span className="text-blue-600">finanças</span> como nunca antes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A plataforma completa para gerenciar receitas, despesas, poupanças e investimentos. 
            Simplifique sua vida financeira com relatórios inteligentes e insights personalizados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register?plan=premium">
              <Button size="lg" className="text-lg px-8 py-3">
                Começar Grátis por 14 dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              <Play className="mr-2 h-5 w-5" />
              Ver Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">50K+</div>
              <div className="text-gray-600">Usuários ativos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">500B+ Kz</div>
              <div className="text-gray-600">Gerenciados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para suas finanças
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas e intuitivas para transformar como você gerencia seu dinheiro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: "Controle de Receitas",
                description: "Registre e categorize todas suas fontes de renda com facilidade"
              },
              {
                icon: CreditCard,
                title: "Gestão de Despesas",
                description: "Monitore gastos em tempo real e identifique oportunidades de economia"
              },
              {
                icon: Target,
                title: "Metas de Poupança",
                description: "Defina objetivos financeiros e acompanhe seu progresso automaticamente"
              },
              {
                icon: BarChart3,
                title: "Relatórios Avançados",
                description: "Visualize seus dados com gráficos interativos e insights personalizados"
              },
              {
                icon: Shield,
                title: "Segurança Bancária",
                description: "Criptografia de nível bancário e conformidade com LGPD"
              },
              {
                icon: Smartphone,
                title: "Acesso Mobile",
                description: "Gerencie suas finanças em qualquer lugar, a qualquer momento"
              }
            ].map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Planos para todos os perfis
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para suas necessidades. Cancele a qualquer momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => (
              <Card key={key} className={`relative ${plan.highlight ? 'ring-2 ring-blue-500 scale-105' : ''} hover:shadow-lg transition-all`}>
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${key}`}>
                    <Button 
                      className={`w-full ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      variant={plan.highlight ? 'default' : 'outline'}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Maria Cardoso",
                role: "Empresária",
                content: "O FinanceControl transformou como gerencio as finanças da minha empresa. Os relatórios são incríveis!",
                rating: 5
              },
              {
                name: "António Fernandes",
                role: "Freelancer",
                content: "Finalmente consegui organizar minha vida financeira. A interface é super intuitiva e os insights são valiosos.",
                rating: 5
              },
              {
                name: "Luisa Manuel",
                role: "Contadora",
                content: "Uso para todos meus clientes. A integração bancária economiza horas de trabalho manual.",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para transformar suas finanças?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já conquistaram a liberdade financeira
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Começar Grátis Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">FinanceControl</span>
              </div>
              <p className="text-gray-400">
                A plataforma completa para controle financeiro pessoal e empresarial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FinanceControl. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}