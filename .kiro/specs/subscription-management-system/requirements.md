# Requirements: Sistema de Gestão de Assinaturas Completo

## Overview

Sistema completo de gestão de assinaturas que inclui configuração de planos com duração/validade, períodos de teste, gestão de assinaturas, promoções/cupões e controlo de expiração com notificações automáticas.

## Actors

- **Utilizador Final**: Pessoa que subscreve um plano e utiliza o sistema
- **Administrador**: Pessoa que gere planos, assinaturas e promoções no backoffice
- **Sistema**: Jobs automáticos que processam expirações e notificações

## User Stories

### 1. Gestão de Planos

#### 1.1 Configuração de Duração do Plano
Como administrador, quero configurar a duração de cada plano (mensal, trimestral, anual) para que os utilizadores saibam por quanto tempo a assinatura é válida.

**Acceptance Criteria:**
- Planos têm campo de duração em dias (30, 90, 365, etc.)
- Planos podem ter duração ilimitada (null)
- A duração é exibida na página de planos
- A data de fim é calculada automaticamente ao subscrever

#### 1.2 Período de Teste (Trial)
Como administrador, quero configurar dias de teste gratuito para cada plano para que os utilizadores possam experimentar antes de pagar.

**Acceptance Criteria:**
- Planos têm campo `trialDays` (0 = sem trial)
- Durante o trial, utilizador tem acesso completo ao plano
- Após o trial, é necessário efectuar pagamento
- Sistema notifica utilizador antes do fim do trial
- Plano gratuito não tem trial (é sempre gratuito)

#### 1.3 Gestão de Planos no Backoffice
Como administrador, quero criar, editar e desactivar planos no backoffice.

**Acceptance Criteria:**
- Listar todos os planos (activos e inactivos)
- Criar novo plano com todos os campos
- Editar plano existente
- Activar/desactivar plano
- Não permitir eliminar plano com assinaturas activas

### 2. Gestão de Assinaturas

#### 2.1 Visualização de Assinaturas
Como administrador, quero ver todas as assinaturas do sistema para monitorar o estado dos utilizadores.

**Acceptance Criteria:**
- Listar todas as assinaturas com filtros (status, plano, data)
- Ver detalhes da assinatura (utilizador, plano, datas, pagamentos)
- Exportar lista de assinaturas

#### 2.2 Estados da Assinatura
Como sistema, quero gerir os estados das assinaturas correctamente.

**Acceptance Criteria:**
- Estados: `trial`, `active`, `pending`, `expired`, `cancelled`
- `trial`: Utilizador em período de teste
- `active`: Assinatura paga e válida
- `pending`: Aguardando pagamento
- `expired`: Assinatura expirou (não renovou)
- `cancelled`: Cancelada pelo utilizador ou admin

#### 2.3 Renovação de Assinatura
Como utilizador, quero renovar minha assinatura antes ou após expirar.

**Acceptance Criteria:**
- Botão de renovar disponível 7 dias antes da expiração
- Renovação estende a data de fim
- Histórico de renovações é mantido

### 3. Sistema de Promoções/Cupões

#### 3.1 Criação de Cupões
Como administrador, quero criar cupões de desconto para campanhas promocionais.

**Acceptance Criteria:**
- Criar cupão com código único
- Tipos de desconto: percentagem ou valor fixo
- Definir validade (data início/fim)
- Definir limite de utilizações
- Restringir a planos específicos (opcional)

#### 3.2 Aplicação de Cupões
Como utilizador, quero aplicar um cupão de desconto ao subscrever.

**Acceptance Criteria:**
- Campo para inserir código do cupão no checkout
- Validação em tempo real do cupão
- Exibir desconto aplicado no resumo
- Registar uso do cupão

#### 3.3 Gestão de Cupões no Backoffice
Como administrador, quero gerir cupões e ver estatísticas de uso.

**Acceptance Criteria:**
- Listar todos os cupões
- Ver estatísticas de uso por cupão
- Activar/desactivar cupão
- Ver histórico de utilizações

### 4. Controlo de Expiração e Notificações

#### 4.1 Job de Verificação de Expirações
Como sistema, quero verificar diariamente as assinaturas que vão expirar.

**Acceptance Criteria:**
- Job executa diariamente
- Identifica assinaturas que expiram em 7, 3 e 1 dia(s)
- Identifica trials que terminam em 3 e 1 dia(s)
- Marca assinaturas expiradas como `expired`

#### 4.2 Notificações de Expiração
Como utilizador, quero ser notificado quando minha assinatura está a expirar.

**Acceptance Criteria:**
- Email/SMS 7 dias antes da expiração
- Email/SMS 3 dias antes da expiração
- Email/SMS 1 dia antes da expiração
- Email/SMS quando expira
- Notificação no dashboard do utilizador

#### 4.3 Notificações de Fim de Trial
Como utilizador, quero ser notificado quando meu período de teste está a terminar.

**Acceptance Criteria:**
- Email/SMS 3 dias antes do fim do trial
- Email/SMS 1 dia antes do fim do trial
- Email/SMS quando trial termina
- Instruções de como efectuar pagamento

### 5. Integração com Fluxo Existente

#### 5.1 Onboarding com Trial
Como utilizador, quero poder iniciar um trial ao registar-me.

**Acceptance Criteria:**
- Se plano tem trial, utilizador entra em trial após registo
- Não é necessário pagamento durante trial
- Após trial, sistema solicita pagamento

#### 5.2 Dashboard do Utilizador
Como utilizador, quero ver o estado da minha assinatura no dashboard.

**Acceptance Criteria:**
- Exibir plano actual
- Exibir data de expiração
- Exibir dias restantes (trial ou assinatura)
- Alertas visuais quando próximo de expirar

## Non-Functional Requirements

### Performance
- Jobs de expiração devem processar até 10.000 assinaturas em menos de 5 minutos
- Validação de cupão deve responder em menos de 500ms

### Security
- Cupões não podem ser reutilizados pelo mesmo utilizador
- Apenas administradores podem gerir planos e cupões
- Logs de auditoria para todas as alterações

### Reliability
- Jobs devem ter retry em caso de falha
- Notificações falhadas devem ser re-tentadas

## Out of Scope

- Integração com sistemas de email externos (usar logs por agora)
- Pagamentos recorrentes automáticos (já existe estrutura básica)
- Múltiplas moedas
