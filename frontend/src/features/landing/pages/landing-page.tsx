import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { getPlans, Plan } from '../../../shared/api/subscriptions';

export function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    loadPlans();
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

  const formatCurrency = (value: number) => {
    if (value === 0) return 'Grátis';
    return (
      new Intl.NumberFormat('pt-AO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' Kz'
    );
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5001/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        alert('Mensagem enviada com sucesso!');
        setContactForm({ name: '', email: '', subject: '', message: '' });
      } else {
        alert('Erro ao enviar mensagem');
      }
    } catch (error) {
      alert('Erro ao enviar mensagem');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">💰</span>
              <span className="ml-2 text-xl font-bold text-gray-900">FinanceControl</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link href="/onboarding">
                <Button>Começar Grátis</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Controle Total das Suas <span className="text-blue-600">Finanças</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Gerencie contas, transações, empréstimos, dívidas e metas de poupança em uma plataforma
            moderna e segura. Desenvolvido especialmente para o mercado angolano.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/onboarding">
              <Button size="lg" className="px-8 py-3">
                Começar Grátis
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="outline" className="px-8 py-3">
                Ver Planos
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Funcionalidades Completas</h2>
            <p className="text-lg text-gray-600">
              Tudo que precisa para gerir as suas finanças pessoais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">🏦</div>
              <h3 className="text-xl font-semibold mb-2">Contas Bancárias</h3>
              <p className="text-gray-600">
                Gerencie múltiplas contas correntes e poupanças dos principais bancos angolanos
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-2">Transações</h3>
              <p className="text-gray-600">
                Controle receitas e despesas com categorização automática e transações recorrentes
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Metas de Poupança</h3>
              <p className="text-gray-600">
                Defina objetivos financeiros e acompanhe o progresso das suas metas
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Empréstimos</h3>
              <p className="text-gray-600">
                Controle empréstimos dados com juros, vencimentos e alertas automáticos
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold mb-2">Dívidas</h3>
              <p className="text-gray-600">
                Gerencie suas dívidas com lembretes de vencimento e planos de pagamento
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Relatórios</h3>
              <p className="text-gray-600">
                Analytics avançados com gráficos, métricas e projeções financeiras
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Planos Simples e Transparentes
            </h2>
            <p className="text-lg text-gray-600">Escolha o plano ideal para as suas necessidades</p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`p-8 text-center relative ${
                    plan.type === 'premium' ? 'border-blue-500 border-2' : ''
                  }`}
                >
                  {plan.type === 'premium' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                      Mais Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-blue-600">
                      {formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-lg text-gray-500">/mês</span>}
                  </div>
                  <ul className="text-left space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-600">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/onboarding?plan=${plan.id}`}>
                    <Button
                      className={`w-full ${
                        plan.type === 'premium'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {plan.price === 0 ? 'Começar Grátis' : 'Escolher Plano'}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Métodos de pagamento aceitos:</p>
            <div className="flex justify-center space-x-8">
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-2xl">📱</span>
                <span>E-Kwanza</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-2xl">⚡</span>
                <span>Multicaixa Express</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-2xl">🏦</span>
                <span>Referência Multicaixa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Entre em Contato</h2>
            <p className="text-lg text-gray-600">Tem dúvidas? Estamos aqui para ajudar</p>
          </div>

          <Card className="p-8">
            <form
              onSubmit={handleContactSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
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
                className="md:col-span-2"
                required
              />
              <textarea
                placeholder="Sua mensagem"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="md:col-span-2 w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
              />
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">
                  Enviar Mensagem
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-blue-400">💰</span>
                <span className="ml-2 text-xl font-bold">FinanceControl</span>
              </div>
              <p className="text-gray-400">
                A plataforma de gestão financeira mais completa de Angola
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Segurança
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Sobre Nós
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Carreiras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contato
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Política de Privacidade
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Cookies
                  </a>
                </li>
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
