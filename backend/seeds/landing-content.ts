import 'dotenv/config';
import { db } from '../src/core/database/db.js';
import { landingContent } from '../src/core/database/schema.js';
import { eq } from 'drizzle-orm';

const sections = [
  {
    section: 'hero',
    content: {
      title: 'Controle Total das Suas',
      titleHighlight: 'Finanças',
      subtitle: 'Gerencie contas, transações, empréstimos, dívidas e metas de poupança em uma plataforma moderna e segura. Desenvolvido especialmente para o mercado angolano.',
      ctaPrimary: 'Começar Grátis',
      ctaSecondary: 'Ver Planos',
      badge: 'Plataforma #1 de Finanças em Angola',
    },
  },
  {
    section: 'features',
    content: {
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
  },
  {
    section: 'testimonials',
    content: {
      title: 'O Que Nossos Clientes Dizem',
      subtitle: 'Milhares de angolanos já transformaram suas finanças',
      items: [
        {
          name: 'Maria Santos',
          role: 'Empresária',
          avatar: '',
          rating: 5,
          text: 'O FinanceControl mudou completamente a forma como gerencio as finanças do meu negócio. Agora tenho controle total sobre receitas e despesas.',
        },
        {
          name: 'João Pedro',
          role: 'Engenheiro',
          avatar: '',
          rating: 5,
          text: 'Finalmente consegui organizar minhas finanças pessoais. As metas de poupança me ajudaram a juntar dinheiro para a casa própria.',
        },
        {
          name: 'Ana Luísa',
          role: 'Médica',
          avatar: '',
          rating: 5,
          text: 'A interface é muito intuitiva e os relatórios são excelentes. Recomendo a todos que querem ter controle financeiro.',
        },
      ],
    },
  },
  {
    section: 'stats',
    content: {
      items: [
        { value: '10.000+', label: 'Utilizadores Ativos' },
        { value: '50M+ Kz', label: 'Transações Gerenciadas' },
        { value: '99.9%', label: 'Uptime Garantido' },
        { value: '4.9/5', label: 'Avaliação Média' },
      ],
    },
  },
  {
    section: 'cta',
    content: {
      title: 'Pronto para Transformar suas Finanças?',
      subtitle: 'Junte-se a milhares de angolanos que já estão no controle do seu dinheiro.',
      buttonText: 'Começar Agora - É Grátis',
    },
  },
  {
    section: 'contact',
    content: {
      title: 'Entre em Contato',
      subtitle: 'Tem dúvidas? Estamos aqui para ajudar',
      email: 'suporte@financecontrol.ao',
      phone: '+244 923 456 789',
      address: 'Luanda, Angola',
    },
  },
  {
    section: 'footer',
    content: {
      description: 'A plataforma de gestão financeira mais completa de Angola',
      copyright: '© 2025 FinanceControl. Todos os direitos reservados.',
      links: {
        product: [
          { label: 'Funcionalidades', href: '#features' },
          { label: 'Preços', href: '#pricing' },
          { label: 'Segurança', href: '#security' },
        ],
        company: [
          { label: 'Sobre Nós', href: '/about' },
          { label: 'Carreiras', href: '/careers' },
          { label: 'Contacto', href: '#contact' },
        ],
        legal: [
          { label: 'Termos de Uso', href: '/terms' },
          { label: 'Política de Privacidade', href: '/privacy' },
          { label: 'Cookies', href: '/cookies' },
        ],
      },
    },
  },
];

async function seedLandingContent() {
  console.log('🌱 Seeding landing content...');

  for (const section of sections) {
    // Check if section already exists
    const [existing] = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.section, section.section));

    if (existing) {
      console.log(`  ⏭️  Section "${section.section}" already exists, skipping...`);
    } else {
      await db.insert(landingContent).values({
        section: section.section,
        content: section.content,
        isActive: true,
      });
      console.log(`  ✅ Created section "${section.section}"`);
    }
  }

  console.log('✅ Landing content seeded successfully!');
}

// Run the seed
seedLandingContent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error seeding landing content:', error);
    process.exit(1);
  });
