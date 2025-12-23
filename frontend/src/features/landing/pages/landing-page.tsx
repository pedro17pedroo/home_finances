import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Check, Loader2, Star, Quote, ArrowRight, Zap, Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { showSuccess, showError } from '../../../shared/lib/alerts';
import { getPlans, Plan } from '../../../shared/api/subscriptions';
import { useTheme } from '../../../shared/contexts/theme-context';

interface LandingContent {
  hero: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: Array<{ name: string; role: string; avatar: string; rating: number; text: string }>;
  };
  stats: {
    items: Array<{ value: string; label: string }>;
  };
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
  contact: {
    title: string;
    subtitle: string;
    email: string;
    phone: string;
    address: string;
  };
  footer: {
    description: string;
    copyright: string;
  };
}

const defaultContent: LandingContent = {
  hero: {
    title: 'Controle Total das Suas',
    titleHighlight: 'Finanças',
    subtitle: 'Gerencie contas, transações, empréstimos, dívidas e metas de poupança em uma plataforma moderna e segura. Desenvolvido especialmente para o mercado angolano.',
    ctaPrimary: 'Começar Grátis',
    ctaSecondary: 'Ver Planos',
  },
  features: {
    title: 'Funcionalidades Completas',
    subtitle: 'Tudo que precisa para gerir as suas finanças pessoais',
    items: [
      { icon: '🏦', title: 'Contas Bancárias', description: 'Gerencie múltiplas contas correntes e poupanças dos principais bancos angolanos' },
      { icon: '💸', title: 'Transações', description: 'Controle receitas e despesas com categorização automática e transações recorrentes' },
      { icon: '🎯', title: 'Metas de Poupança', description: 'Defina objetivos financeiros e acompanhe o progresso das suas metas' },
      { icon: '💰', title: 'Empréstimos', description: 'Controle empréstimos dados com juros, vencimentos e alertas automáticos' },
      { icon: '💳', title: 'Dívidas', description: 'Gerencie suas dívidas com lembretes de vencimento e planos de pagamento' },
      { icon: '📊', title: 'Relatórios', description: 'Analytics avançados com gráficos, métricas e projeções financeiras' },
    ],
  },
  testimonials: {
    title: 'O Que Nossos Clientes Dizem',
    subtitle: 'Milhares de angolanos já transformaram suas finanças',
    items: [
      { name: 'Maria Santos', role: 'Empresária', avatar: '', rating: 5, text: 'O FinanceControl mudou completamente a forma como gerencio as finanças do meu negócio.' },
      { name: 'João Pedro', role: 'Engenheiro', avatar: '', rating: 5, text: 'Finalmente consegui organizar minhas finanças pessoais. As metas de poupança me ajudaram muito.' },
      { name: 'Ana Luísa', role: 'Médica', avatar: '', rating: 5, text: 'A interface é muito intuitiva e os relatórios são excelentes. Recomendo a todos.' },
    ],
  },
  stats: {
    items: [
      { value: '10.000+', label: 'Utilizadores Ativos' },
      { value: '50M+ Kz', label: 'Transações Gerenciadas' },
      { value: '99.9%', label: 'Uptime Garantido' },
      { value: '4.9/5', label: 'Avaliação Média' },
    ],
  },
  cta: {
    title: 'Pronto para Transformar suas Finanças?',
    subtitle: 'Junte-se a milhares de angolanos que já estão no controle do seu dinheiro.',
    buttonText: 'Começar Agora - É Grátis',
  },
  contact: {
    title: 'Entre em Contato',
    subtitle: 'Tem dúvidas? Estamos aqui para ajudar',
    email: 'suporte@financecontrol.ao',
    phone: '+244 923 456 789',
    address: 'Luanda, Angola',
  },
  footer: {
    description: 'A plataforma de gestão financeira mais completa de Angola',
    copyright: '© 2025 FinanceControl. Todos os direitos reservados.',
  },
};

export function LandingPage() {
  const { darkMode, toggleTheme } = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [content, setContent] = useState<LandingContent>(defaultContent);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    loadPlans();
    loadContent();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadContent = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/landing-content');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          setContent({ ...defaultContent, ...data.content });
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + ' Kz';
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (response.ok) {
        await showSuccess('Mensagem Enviada', 'Sua mensagem foi enviada com sucesso!');
        setContactForm({ name: '', email: '', subject: '', message: '' });
      } else {
        await showError('Erro', 'Não foi possível enviar sua mensagem.');
      }
    } catch (error) {
      await showError('Erro', 'Ocorreu um erro ao enviar a mensagem.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
    ));
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">💰 FinanceControl</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition">Funcionalidades</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition">Testemunhos</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition">Preços</a>
              <a href="#contact" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition">Contacto</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-yellow-400">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link href="/login" className="hidden md:block">
                <Button variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Entrar</Button>
              </Link>
              <Link href="/onboarding" className="hidden md:block">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Começar Grátis</Button>
              </Link>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
                {mobileMenuOpen ? <X className="w-6 h-6 text-gray-900 dark:text-white" /> : <Menu className="w-6 h-6 text-gray-900 dark:text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2 text-gray-600 dark:text-gray-300">Funcionalidades</a>
              <a href="#testimonials" className="block py-2 text-gray-600 dark:text-gray-300">Testemunhos</a>
              <a href="#pricing" className="block py-2 text-gray-600 dark:text-gray-300">Preços</a>
              <a href="#contact" className="block py-2 text-gray-600 dark:text-gray-300">Contacto</a>
              <div className="pt-4 space-y-2">
                <Link href="/login"><Button variant="outline" className="w-full">Entrar</Button></Link>
                <Link href="/onboarding"><Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Começar Grátis</Button></Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 mb-8">
              <Zap className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Plataforma #1 de Finanças em Angola</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
              {content.hero.title}{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{content.hero.titleHighlight}</span>
            </h1>
            <p className="text-lg md:text-xl mb-10 max-w-3xl mx-auto text-gray-600 dark:text-gray-400">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/onboarding">
                <Button size="lg" className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-600/25">
                  {content.hero.ctaPrimary}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {content.hero.ctaSecondary}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {content.stats.items.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {content.features.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {content.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.features.items.map((feature, index) => (
              <Card key={index} className="p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {content.testimonials.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {content.testimonials.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.testimonials.items.map((testimonial, index) => (
              <Card key={index} className="p-6 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-gray-200 dark:text-gray-700" />
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                    index === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-purple-500 to-indigo-500'
                  }`}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">{renderStars(testimonial.rating)}</div>
                <p className="italic text-gray-600 dark:text-gray-300">"{testimonial.text}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Planos Simples e Transparentes
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Escolha o plano ideal para as suas necessidades
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card key={plan.id} className={`p-8 text-center relative transition-all duration-300 hover:shadow-xl ${
                  plan.type === 'premium' ? 'border-2 border-blue-500 scale-105 shadow-lg' : ''
                }`}>
                  {plan.type === 'premium' && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-1 rounded-full text-sm font-medium">
                      Mais Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-lg text-gray-500 dark:text-gray-400">/mês</span>}
                  </div>
                  <ul className="text-left space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-600 dark:text-gray-300">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/onboarding?plan=${plan.id}`}>
                    <Button className={`w-full ${
                      plan.type === 'premium'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                    }`}>
                      {plan.price === 0 ? 'Começar Grátis' : 'Escolher Plano'}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-16 text-center">
            <p className="mb-6 text-gray-500 dark:text-gray-400">Métodos de pagamento aceitos:</p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                <span className="text-2xl">📱</span>
                <span>E-Kwanza</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                <span className="text-2xl">⚡</span>
                <span>Multicaixa Express</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                <span className="text-2xl">🏦</span>
                <span>Referência Multicaixa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {content.cta.title}
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            {content.cta.subtitle}
          </p>
          <Link href="/onboarding">
            <Button size="lg" className="px-8 py-4 text-lg bg-white text-blue-600 hover:bg-gray-100 shadow-lg">
              {content.cta.buttonText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {content.contact.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {content.contact.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl">📧</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Email</p>
                  <p>{content.contact.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl">📞</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Telefone</p>
                  <p>{content.contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl">📍</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Localização</p>
                  <p>{content.contact.address}</p>
                </div>
              </div>
            </div>

            <Card className="p-6">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <Input
                  placeholder="Seu nome"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Seu email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
                <Input
                  placeholder="Assunto"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Sua mensagem"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full p-3 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Enviar Mensagem
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">💰 FinanceControl</span>
              </div>
              <p className="text-gray-400">{content.footer.description}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Preços</a></li>
                <li><a href="#" className="hover:text-white transition">Segurança</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition">Carreiras</a></li>
                <li><a href="#contact" className="hover:text-white transition">Contacto</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>{content.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
