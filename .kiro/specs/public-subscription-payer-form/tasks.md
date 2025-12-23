# Implementation Plan: Public Subscription Payer Form

## Overview

Este plano implementa a melhoria do formulário de pagamento no fluxo de onboarding público, adicionando campos de dados do pagador com pré-preenchimento automático e resumo do pagamento, alinhando a experiência com o modal de pagamento da página de assinatura.

## Tasks

- [x] 1. Adicionar estados para dados do pagador
  - Adicionar estados `payerPhone`, `payerName`, `payerEmail` no componente OnboardingPage
  - Inicializar com strings vazias
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [-] 2. Implementar pré-preenchimento dos dados do pagador
  - [x] 2.1 Criar função `prefillPayerData` que copia dados do formulário de registro
    - Concatenar firstName e lastName para payerName
    - Copiar phone para payerPhone
    - Copiar email para payerEmail
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 Chamar `prefillPayerData` quando o usuário avança para o step 'payment'
    - Modificar `handleRegisterSubmit` para chamar a função antes de mudar o step
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 2.3 Escrever teste de propriedade para pré-preenchimento
    - **Property 1: Pré-preenchimento dos dados do pagador**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [-] 3. Implementar formulário de dados do pagador no Step Payment
  - [x] 3.1 Adicionar seção de dados do pagador após seleção de método de pagamento
    - Criar container com título "Dados do Pagador"
    - Adicionar texto explicativo sobre alteração dos dados
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 3.2 Implementar campo de telefone condicional
    - Exibir apenas quando paymentMethod for 'ekwanza' ou 'gpo'
    - Adicionar label e input com valor controlado por payerPhone
    - Adicionar mensagem contextual baseada no método
    - _Requirements: 2.3, 2.5, 5.1, 5.2_
  - [x] 3.3 Implementar campo de nome do pagador
    - Adicionar label e input com valor controlado por payerName
    - _Requirements: 2.1, 2.4_
  - [x] 3.4 Implementar campo de email do pagador
    - Adicionar label e input com valor controlado por payerEmail
    - Adicionar mensagem sobre envio do comprovativo
    - _Requirements: 2.2, 2.4, 5.3_
  - [ ] 3.5 Escrever teste de propriedade para exibição condicional do telefone
    - **Property 2: Exibição condicional do campo de telefone**
    - **Validates: Requirements 2.3**

- [-] 4. Implementar resumo do pagamento
  - [x] 4.1 Criar componente de resumo abaixo dos campos do pagador
    - Exibir nome do plano
    - Exibir tipo de pagamento formatado
    - Exibir método de pagamento
    - Exibir valor total formatado
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 4.2 Escrever teste de propriedade para resumo
    - **Property 3: Resumo contém informações corretas**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [-] 5. Implementar validação dos dados do pagador
  - [x] 5.1 Criar função `validatePayerData`
    - Verificar telefone obrigatório para ekwanza/gpo
    - Verificar formato de email se informado
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.2 Desabilitar botão de confirmar quando validação falhar
    - Adicionar condição no disabled do botão
    - _Requirements: 4.1_
  - [x] 5.3 Exibir mensagem de alerta quando telefone for obrigatório e estiver vazio
    - Adicionar alerta visual acima do formulário
    - _Requirements: 4.2_
  - [ ] 5.4 Escrever teste de propriedade para validação de telefone
    - **Property 4: Validação de telefone obrigatório**
    - **Validates: Requirements 4.1, 4.2**
  - [ ] 5.5 Escrever teste de propriedade para validação de email
    - **Property 6: Validação de formato de email**
    - **Validates: Requirements 4.3**

- [-] 6. Integrar dados do pagador na requisição de pagamento
  - [x] 6.1 Modificar `handlePaymentSubmit` para incluir dados do pagador
    - Passar payerPhone, payerName, payerEmail na requisição
    - _Requirements: 4.4_
  - [ ] 6.2 Escrever teste de propriedade para envio dos dados
    - **Property 5: Dados do pagador enviados na requisição**
    - **Validates: Requirements 4.4**

- [ ] 7. Checkpoint - Verificar implementação
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Todas as tasks são obrigatórias, incluindo os testes de propriedade
- Cada task referencia os requisitos específicos para rastreabilidade
- Os testes de propriedade usarão a biblioteca `fast-check`
- A implementação é apenas no frontend, não requer alterações no backend
