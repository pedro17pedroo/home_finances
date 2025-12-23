# Requirements Document

## Introduction

Este documento define os requisitos para melhorar o formulário de pagamento no fluxo de onboarding público (Step 3 - Pagamento). O objetivo é alinhar a experiência do usuário com o modal de pagamento existente na página de assinatura para usuários logados, permitindo que o sistema carregue automaticamente os dados do usuário registrado e possibilite a inserção de dados de outro pagador.

## Glossary

- **Onboarding_Page**: Página pública de cadastro e assinatura acessível em `/onboarding`
- **Payment_Step**: Terceiro passo do fluxo de onboarding onde o usuário seleciona método de pagamento
- **Payer_Form**: Formulário com dados do pagador (nome, telefone, email)
- **Subscription_Page**: Página de gerenciamento de assinatura para usuários logados em `/subscription`
- **Payment_Modal**: Modal de pagamento com 3 steps (Tipo, Método, Pagador) na página de assinatura
- **User_Data**: Dados do usuário registrado (nome, telefone, email) armazenados no sistema

## Requirements

### Requirement 1: Carregar Dados do Usuário Registrado

**User Story:** Como um usuário que acabou de se registrar, quero que meus dados sejam automaticamente preenchidos no formulário de pagamento, para que eu não precise digitá-los novamente.

#### Acceptance Criteria

1. WHEN o usuário avança para o Payment_Step após o registro, THE Onboarding_Page SHALL pré-preencher o campo de telefone com o telefone do usuário registrado
2. WHEN o usuário avança para o Payment_Step após o registro, THE Onboarding_Page SHALL pré-preencher o campo de nome com o nome completo do usuário registrado
3. WHEN o usuário avança para o Payment_Step após o registro, THE Onboarding_Page SHALL pré-preencher o campo de email com o email do usuário registrado
4. IF o usuário não possui telefone cadastrado, THEN THE Onboarding_Page SHALL deixar o campo de telefone vazio

### Requirement 2: Permitir Alteração dos Dados do Pagador

**User Story:** Como um usuário, quero poder alterar os dados do pagador, para que outra pessoa possa efetuar o pagamento por mim.

#### Acceptance Criteria

1. THE Payer_Form SHALL exibir campos editáveis para nome do pagador
2. THE Payer_Form SHALL exibir campos editáveis para email do pagador
3. WHEN o método de pagamento selecionado for E-Kwanza ou Multicaixa Express, THE Payer_Form SHALL exibir campo editável para telefone do pagador
4. THE Payer_Form SHALL permitir que o usuário altere qualquer campo pré-preenchido
5. WHEN o método de pagamento for E-Kwanza ou Multicaixa Express, THE Payer_Form SHALL exibir mensagem informando que a notificação será enviada para o número informado

### Requirement 3: Exibir Resumo do Pagamento

**User Story:** Como um usuário, quero ver um resumo completo do pagamento antes de confirmar, para ter certeza de que todas as informações estão corretas.

#### Acceptance Criteria

1. THE Payer_Form SHALL exibir um resumo contendo o nome do plano selecionado
2. THE Payer_Form SHALL exibir um resumo contendo o tipo de pagamento (Único ou Assinatura)
3. THE Payer_Form SHALL exibir um resumo contendo o método de pagamento selecionado
4. THE Payer_Form SHALL exibir um resumo contendo o valor total a pagar
5. THE Payer_Form SHALL posicionar o resumo abaixo dos campos do pagador

### Requirement 4: Validação dos Dados do Pagador

**User Story:** Como um sistema, quero validar os dados do pagador antes de processar o pagamento, para garantir que as informações necessárias estão corretas.

#### Acceptance Criteria

1. WHEN o método de pagamento for E-Kwanza ou Multicaixa Express e o telefone estiver vazio, THE Onboarding_Page SHALL impedir o envio do formulário
2. WHEN o método de pagamento for E-Kwanza ou Multicaixa Express e o telefone estiver vazio, THE Onboarding_Page SHALL exibir mensagem de erro indicando que o telefone é obrigatório
3. IF o email for informado, THEN THE Onboarding_Page SHALL validar o formato do email
4. THE Onboarding_Page SHALL enviar os dados do pagador (payerPhone, payerName, payerEmail) na requisição de subscrição

### Requirement 5: Mensagens Informativas

**User Story:** Como um usuário, quero ver mensagens claras sobre para onde as notificações serão enviadas, para saber o que esperar após confirmar o pagamento.

#### Acceptance Criteria

1. WHEN o método de pagamento for E-Kwanza, THE Payer_Form SHALL exibir mensagem informando que o código de pagamento será enviado para o telefone informado
2. WHEN o método de pagamento for Multicaixa Express, THE Payer_Form SHALL exibir mensagem informando que a notificação será enviada para o telefone informado
3. THE Payer_Form SHALL exibir mensagem informando que o comprovativo será enviado para o email informado
