-- FAQ Items table
CREATE TABLE IF NOT EXISTS faq_items (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  replied_at TIMESTAMP,
  replied_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default FAQ items
INSERT INTO faq_items (category, question, answer, "order") VALUES
('geral', 'O que é o Finance Control?', 'O Finance Control é uma aplicação de gestão financeira pessoal que ajuda você a controlar suas receitas, despesas, empréstimos, dívidas e metas de poupança de forma simples e eficiente.', 1),
('geral', 'A aplicação é gratuita?', 'Sim! O Finance Control oferece um plano gratuito com funcionalidades básicas. Para recursos avançados como relatórios detalhados, múltiplas contas e integração com WhatsApp, oferecemos planos Premium e Enterprise.', 2),
('geral', 'Posso usar em vários dispositivos?', 'Sim, você pode acessar sua conta em qualquer dispositivo. Seus dados são sincronizados automaticamente na nuvem.', 3),
('conta', 'Como criar uma conta?', 'Basta baixar a aplicação, clicar em "Criar Conta" e preencher seus dados básicos como nome, email ou telefone e senha. É rápido e simples!', 1),
('conta', 'Esqueci minha senha, o que fazer?', 'Na tela de login, clique em "Esqueci minha senha". Você receberá um código por email ou SMS para redefinir sua senha.', 2),
('conta', 'Como alterar meus dados pessoais?', 'Acesse o menu Perfil > Dados Pessoais. Lá você pode atualizar seu nome, email, telefone e foto de perfil.', 3),
('pagamentos', 'Quais formas de pagamento são aceitas?', 'Aceitamos pagamentos via Multicaixa Express (GPO), E-Kwanza e Referência Bancária para os planos Premium e Enterprise.', 1),
('pagamentos', 'Como fazer upgrade do meu plano?', 'Acesse Perfil > Assinatura e escolha o plano desejado. Siga as instruções para efetuar o pagamento.', 2),
('pagamentos', 'Posso cancelar minha assinatura?', 'Sim, você pode cancelar a qualquer momento em Perfil > Assinatura. Você continuará tendo acesso até o fim do período pago.', 3),
('seguranca', 'Meus dados estão seguros?', 'Sim! Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança. Seus dados financeiros nunca são compartilhados com terceiros.', 1),
('seguranca', 'O que é a autenticação biométrica?', 'É uma camada extra de segurança que permite usar sua impressão digital ou reconhecimento facial para acessar a aplicação.', 2),
('seguranca', 'Como ativar a autenticação em dois fatores?', 'Acesse Perfil > Segurança > Autenticação em Dois Fatores e siga as instruções para configurar.', 3)
ON CONFLICT DO NOTHING;

-- Insert default legal content if not exists
INSERT INTO legal_content (type, title, content, version) VALUES
('terms', 'Termos de Uso', '# Termos de Uso do Finance Control

## 1. Aceitação dos Termos

Ao utilizar o Finance Control, você concorda com estes Termos de Uso. Se não concordar, não utilize nossos serviços.

## 2. Descrição do Serviço

O Finance Control é uma plataforma de gestão financeira pessoal que permite:
- Registrar receitas e despesas
- Gerenciar contas bancárias
- Controlar empréstimos e dívidas
- Definir metas de poupança
- Gerar relatórios financeiros

## 3. Cadastro e Conta

Para usar o serviço, você deve:
- Ter pelo menos 18 anos
- Fornecer informações verdadeiras
- Manter sua senha em sigilo
- Notificar-nos sobre uso não autorizado

## 4. Uso Aceitável

Você concorda em não:
- Violar leis ou regulamentos
- Compartilhar conteúdo ilegal
- Tentar acessar dados de outros usuários
- Usar o serviço para fins fraudulentos

## 5. Propriedade Intelectual

Todo o conteúdo do Finance Control é protegido por direitos autorais. Você não pode copiar, modificar ou distribuir nosso conteúdo sem autorização.

## 6. Limitação de Responsabilidade

O Finance Control é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros.

## 7. Alterações nos Termos

Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças significativas.

## 8. Contato

Para dúvidas sobre estes termos, entre em contato: suporte@financecontrol.ao

Última atualização: Dezembro 2024', '1.0'),
('privacy', 'Política de Privacidade', '# Política de Privacidade do Finance Control

## 1. Introdução

Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais.

## 2. Dados que Coletamos

### 2.1 Dados fornecidos por você:
- Nome e sobrenome
- Email e telefone
- Dados financeiros (transações, contas, etc.)

### 2.2 Dados coletados automaticamente:
- Informações do dispositivo
- Logs de acesso
- Dados de uso da aplicação

## 3. Como Usamos seus Dados

Utilizamos seus dados para:
- Fornecer e melhorar nossos serviços
- Personalizar sua experiência
- Enviar notificações importantes
- Garantir a segurança da plataforma

## 4. Compartilhamento de Dados

Não vendemos seus dados. Podemos compartilhar informações apenas:
- Com seu consentimento
- Para cumprir obrigações legais
- Com prestadores de serviço essenciais

## 5. Segurança dos Dados

Implementamos medidas de segurança como:
- Criptografia de dados
- Controle de acesso
- Monitoramento de segurança
- Backups regulares

## 6. Seus Direitos

Você tem direito a:
- Acessar seus dados
- Corrigir informações incorretas
- Solicitar exclusão de dados
- Exportar seus dados

## 7. Retenção de Dados

Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações legais.

## 8. Cookies

Utilizamos cookies para melhorar sua experiência. Você pode gerenciar preferências de cookies nas configurações.

## 9. Alterações nesta Política

Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas.

## 10. Contato

Para questões sobre privacidade: privacidade@financecontrol.ao

Última atualização: Dezembro 2024', '1.0')
ON CONFLICT DO NOTHING;
