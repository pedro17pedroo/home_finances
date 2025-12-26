import 'dotenv/config';
import { db } from '../src/core/database/db.js';
import { legalContent } from '../src/core/database/schema.js';
import { eq } from 'drizzle-orm';

const legalContents = [
  {
    type: 'terms',
    title: 'Termos de Uso',
    version: '1.0',
    content: `
<h2>1. Aceitação dos Termos</h2>
<p>Ao acessar e usar o FinanceControl, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.</p>

<h2>2. Descrição do Serviço</h2>
<p>O FinanceControl é uma plataforma de gestão financeira pessoal que permite aos utilizadores:</p>
<ul>
  <li>Gerir contas bancárias e saldos</li>
  <li>Registar e categorizar transações</li>
  <li>Definir e acompanhar metas de poupança</li>
  <li>Controlar empréstimos e dívidas</li>
  <li>Gerar relatórios financeiros</li>
</ul>

<h2>3. Registo e Conta</h2>
<p>Para utilizar o FinanceControl, você deve:</p>
<ul>
  <li>Ter pelo menos 18 anos de idade</li>
  <li>Fornecer informações verdadeiras e completas durante o registo</li>
  <li>Manter a confidencialidade da sua senha</li>
  <li>Notificar-nos imediatamente sobre qualquer uso não autorizado da sua conta</li>
</ul>

<h2>4. Uso Aceitável</h2>
<p>Você concorda em não:</p>
<ul>
  <li>Usar o serviço para fins ilegais</li>
  <li>Tentar acessar contas de outros utilizadores</li>
  <li>Interferir com a segurança ou funcionamento do serviço</li>
  <li>Transmitir vírus ou código malicioso</li>
  <li>Usar o serviço para spam ou publicidade não autorizada</li>
</ul>

<h2>5. Propriedade Intelectual</h2>
<p>Todo o conteúdo do FinanceControl, incluindo textos, gráficos, logotipos, ícones e software, é propriedade da FinanceControl ou dos seus licenciadores e está protegido por leis de direitos autorais.</p>

<h2>6. Privacidade</h2>
<p>O uso dos seus dados pessoais é regido pela nossa Política de Privacidade. Ao usar o FinanceControl, você consente com a recolha e uso dos seus dados conforme descrito nessa política.</p>

<h2>7. Pagamentos e Assinaturas</h2>
<p>Alguns recursos do FinanceControl requerem uma assinatura paga. Os termos de pagamento incluem:</p>
<ul>
  <li>Os preços são apresentados em Kwanzas (Kz)</li>
  <li>As assinaturas são renovadas automaticamente, salvo cancelamento</li>
  <li>Não há reembolsos para períodos parciais</li>
  <li>Reservamo-nos o direito de alterar os preços com aviso prévio de 30 dias</li>
</ul>

<h2>8. Limitação de Responsabilidade</h2>
<p>O FinanceControl é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros. Não somos responsáveis por:</p>
<ul>
  <li>Perdas financeiras resultantes do uso do serviço</li>
  <li>Decisões financeiras tomadas com base nas informações do serviço</li>
  <li>Interrupções temporárias do serviço</li>
</ul>

<h2>9. Modificações dos Termos</h2>
<p>Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor após a publicação no site. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.</p>

<h2>10. Rescisão</h2>
<p>Podemos suspender ou encerrar a sua conta se você violar estes termos. Você pode encerrar a sua conta a qualquer momento através das configurações da conta.</p>

<h2>11. Lei Aplicável</h2>
<p>Estes termos são regidos pelas leis da República de Angola. Qualquer disputa será resolvida nos tribunais de Luanda.</p>

<h2>12. Contacto</h2>
<p>Para questões sobre estes termos, contacte-nos:</p>
<ul>
  <li>Email: suporte@financecontrol.ao</li>
  <li>Telefone: +244 923 456 789</li>
  <li>Endereço: Luanda, Angola</li>
</ul>
    `.trim(),
  },
  {
    type: 'privacy',
    title: 'Política de Privacidade',
    version: '1.0',
    content: `
<h2>1. Introdução</h2>
<p>A FinanceControl está comprometida em proteger a sua privacidade. Esta política descreve como recolhemos, usamos e protegemos os seus dados pessoais.</p>

<h2>2. Dados que Recolhemos</h2>
<p>Recolhemos os seguintes tipos de dados:</p>

<h3>2.1 Dados de Registo</h3>
<ul>
  <li>Nome completo</li>
  <li>Endereço de email</li>
  <li>Número de telefone</li>
  <li>Senha (armazenada de forma encriptada)</li>
</ul>

<h3>2.2 Dados Financeiros</h3>
<ul>
  <li>Informações de contas bancárias</li>
  <li>Transações registadas</li>
  <li>Metas de poupança</li>
  <li>Empréstimos e dívidas</li>
</ul>

<h3>2.3 Dados de Uso</h3>
<ul>
  <li>Endereço IP</li>
  <li>Tipo de navegador e dispositivo</li>
  <li>Páginas visitadas e funcionalidades utilizadas</li>
  <li>Data e hora de acesso</li>
</ul>

<h2>3. Como Usamos os Seus Dados</h2>
<p>Utilizamos os seus dados para:</p>
<ul>
  <li>Fornecer e melhorar os nossos serviços</li>
  <li>Processar transações e pagamentos</li>
  <li>Enviar notificações importantes sobre a sua conta</li>
  <li>Responder às suas questões e pedidos de suporte</li>
  <li>Prevenir fraudes e garantir a segurança</li>
  <li>Cumprir obrigações legais</li>
</ul>

<h2>4. Partilha de Dados</h2>
<p>Não vendemos os seus dados pessoais. Podemos partilhar dados com:</p>
<ul>
  <li>Prestadores de serviços de pagamento (para processar transações)</li>
  <li>Autoridades legais (quando exigido por lei)</li>
  <li>Parceiros de análise (dados anonimizados)</li>
</ul>

<h2>5. Segurança dos Dados</h2>
<p>Implementamos medidas de segurança robustas:</p>
<ul>
  <li>Encriptação SSL/TLS para todas as comunicações</li>
  <li>Encriptação de dados sensíveis em repouso</li>
  <li>Autenticação de dois fatores disponível</li>
  <li>Monitorização contínua de segurança</li>
  <li>Backups regulares e seguros</li>
</ul>

<h2>6. Os Seus Direitos</h2>
<p>Você tem o direito de:</p>
<ul>
  <li>Acessar os seus dados pessoais</li>
  <li>Corrigir dados incorretos</li>
  <li>Solicitar a eliminação dos seus dados</li>
  <li>Exportar os seus dados</li>
  <li>Retirar o consentimento a qualquer momento</li>
</ul>

<h2>7. Retenção de Dados</h2>
<p>Mantemos os seus dados enquanto a sua conta estiver ativa. Após o encerramento da conta:</p>
<ul>
  <li>Dados financeiros são eliminados após 30 dias</li>
  <li>Dados de faturação são mantidos por 5 anos (obrigação legal)</li>
  <li>Logs de segurança são mantidos por 1 ano</li>
</ul>

<h2>8. Cookies</h2>
<p>Utilizamos cookies para:</p>
<ul>
  <li>Manter a sua sessão ativa</li>
  <li>Lembrar as suas preferências</li>
  <li>Analisar o uso do serviço</li>
</ul>
<p>Pode gerir as preferências de cookies nas configurações do seu navegador.</p>

<h2>9. Menores de Idade</h2>
<p>O FinanceControl não é destinado a menores de 18 anos. Não recolhemos intencionalmente dados de menores.</p>

<h2>10. Alterações a Esta Política</h2>
<p>Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por email ou através do serviço.</p>

<h2>11. Contacto</h2>
<p>Para questões sobre privacidade ou para exercer os seus direitos:</p>
<ul>
  <li>Email: privacidade@financecontrol.ao</li>
  <li>Telefone: +244 923 456 789</li>
  <li>Endereço: Luanda, Angola</li>
</ul>

<h2>12. Autoridade de Proteção de Dados</h2>
<p>Se não estiver satisfeito com a nossa resposta, pode apresentar uma reclamação à autoridade de proteção de dados competente em Angola.</p>
    `.trim(),
  },
  {
    type: 'cookies',
    title: 'Política de Cookies',
    version: '1.0',
    content: `
<h2>1. O Que São Cookies</h2>
<p>Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita o nosso site. Eles ajudam a melhorar a sua experiência de navegação.</p>

<h2>2. Tipos de Cookies que Utilizamos</h2>

<h3>2.1 Cookies Essenciais</h3>
<p>Necessários para o funcionamento básico do site:</p>
<ul>
  <li>Autenticação e sessão</li>
  <li>Preferências de segurança</li>
  <li>Carrinho de compras (para assinaturas)</li>
</ul>

<h3>2.2 Cookies de Preferências</h3>
<p>Lembram as suas escolhas:</p>
<ul>
  <li>Idioma preferido</li>
  <li>Tema (claro/escuro)</li>
  <li>Configurações de exibição</li>
</ul>

<h3>2.3 Cookies de Análise</h3>
<p>Ajudam-nos a entender como usa o site:</p>
<ul>
  <li>Páginas visitadas</li>
  <li>Tempo de permanência</li>
  <li>Funcionalidades mais utilizadas</li>
</ul>

<h2>3. Como Gerir Cookies</h2>
<p>Pode controlar os cookies através das configurações do seu navegador. Note que desativar alguns cookies pode afetar a funcionalidade do site.</p>

<h2>4. Contacto</h2>
<p>Para questões sobre cookies: suporte@financecontrol.ao</p>
    `.trim(),
  },
];

async function seedLegalContent() {
  console.log('🌱 Seeding legal content...');

  for (const item of legalContents) {
    // Check if content already exists
    const [existing] = await db
      .select()
      .from(legalContent)
      .where(eq(legalContent.type, item.type));

    if (existing) {
      console.log(`  ⏭️  Legal content "${item.type}" already exists, skipping...`);
    } else {
      await db.insert(legalContent).values({
        type: item.type,
        title: item.title,
        content: item.content,
        version: item.version,
        isActive: true,
      });
      console.log(`  ✅ Created legal content "${item.type}"`);
    }
  }

  console.log('✅ Legal content seeded successfully!');
}

// Run the seed
seedLegalContent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error seeding legal content:', error);
    process.exit(1);
  });
