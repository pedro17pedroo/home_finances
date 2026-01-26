import { Router } from 'express';
import { db } from '../../core/database/db.js';
import { landingContent } from '../../core/database/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Default content for each section
const defaultContent = {
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
      { icon: '💰', title: 'Dinheiro Emprestado', description: 'Controle dinheiro emprestado com juros, vencimentos e alertas automáticos' },
      { icon: '💳', title: 'Dívidas', description: 'Gerencie suas dívidas com lembretes de vencimento e planos de pagamento' },
      { icon: '📊', title: 'Relatórios', description: 'Analytics avançados com gráficos, métricas e projeções financeiras' },
    ],
  },
  testimonials: {
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

// Get all landing content (public)
router.get('/', async (req, res) => {
  try {
    const content = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.isActive, true));

    // Build response with defaults for missing sections
    const sections = ['hero', 'features', 'testimonials', 'stats', 'cta', 'contact', 'footer'];
    const result: Record<string, any> = {};

    for (const section of sections) {
      const found = content.find(c => c.section === section);
      result[section] = found ? found.content : defaultContent[section as keyof typeof defaultContent];
    }

    res.json({ success: true, content: result });
  } catch (error: any) {
    console.error('Get landing content error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific section (public)
router.get('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    
    const [content] = await db
      .select()
      .from(landingContent)
      .where(and(
        eq(landingContent.section, section),
        eq(landingContent.isActive, true)
      ));

    if (content) {
      res.json({ success: true, content: content.content });
    } else {
      // Return default content
      const defaultSection = defaultContent[section as keyof typeof defaultContent];
      if (defaultSection) {
        res.json({ success: true, content: defaultSection, isDefault: true });
      } else {
        res.status(404).json({ success: false, message: 'Secção não encontrada' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update section content (admin only)
router.put('/:section', requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Conteúdo é obrigatório' });
    }

    // Check if section exists
    const [existing] = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.section, section));

    if (existing) {
      // Update
      await db
        .update(landingContent)
        .set({ content, updatedAt: new Date() })
        .where(eq(landingContent.section, section));
    } else {
      // Insert
      await db.insert(landingContent).values({
        section,
        content,
        isActive: true,
      });
    }

    res.json({ success: true, message: 'Conteúdo atualizado com sucesso' });
  } catch (error: any) {
    console.error('Update landing content error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset section to default (admin only)
router.post('/:section/reset', requireAdmin, async (req, res) => {
  try {
    const { section } = req.params;
    
    const defaultSection = defaultContent[section as keyof typeof defaultContent];
    if (!defaultSection) {
      return res.status(404).json({ success: false, message: 'Secção não encontrada' });
    }

    // Delete existing
    await db.delete(landingContent).where(eq(landingContent.section, section));

    res.json({ success: true, message: 'Conteúdo restaurado para o padrão', content: defaultSection });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all sections for admin
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const content = await db.select().from(landingContent);
    
    // Build response with all sections including defaults
    const sections = ['hero', 'features', 'testimonials', 'stats', 'cta', 'contact', 'footer'];
    const result = sections.map(section => {
      const found = content.find(c => c.section === section);
      return {
        section,
        content: found ? found.content : defaultContent[section as keyof typeof defaultContent],
        isCustom: !!found,
        id: found?.id,
        updatedAt: found?.updatedAt,
      };
    });

    res.json({ success: true, sections: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
