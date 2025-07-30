# Sistema de Pagamentos e Subscrições - Documentação Completa

## 1. O que acontece quando os 14 dias de teste terminam?

### Estado Atual
- Usuários são criados com `subscriptionStatus: 'trialing'` e `trialEndsAt: +14 dias`
- Sistema não verifica automaticamente o fim do trial

### Comportamento Necessário
1. **Verificação Automática**: Job diário verifica usuários com trial expirado
2. **Mudança de Status**: `trialing` → `trial_expired`
3. **Bloqueio de Acesso**: Middleware bloqueia funcionalidades principais
4. **Notificações**: Emails/SMS 3 dias antes, no dia, e 7 dias após expiração

## 2. Como o usuário pode pagar para subscrever?

### Métodos de Pagamento Disponíveis
1. **Stripe** (Cartão): Automático, imediato
2. **Multicaixa Express**: Manual, necessita confirmação
3. **Unitel Money**: Manual, necessita confirmação
4. **AfriMoney**: Manual, necessita confirmação
5. **Transferência Bancária**: Manual, necessita upload de comprovante

### Fluxo de Pagamento
1. Usuário escolhe plano na página de subscrição
2. Seleciona método de pagamento
3. **Se Stripe**: Processo automático via Stripe
4. **Se outros**: Processo manual com instruções específicas

## 3. Transferência Bancária - Como funciona?

### Para o Usuário
1. Recebe instruções com:
   - Dados bancários (BAI, BFA, BIC)
   - Valor exato em Kz
   - Referência única de pagamento
2. Faz transferência no seu banco
3. Tira foto do comprovante
4. Faz upload na plataforma
5. Aguarda confirmação (1-3 dias úteis)

### Para o Sistema
1. Cria `payment_transaction` com status `pending`
2. Gera referência única
3. Armazena comprovante em `payment_confirmations`
4. Notifica admin para verificação manual

## 4. Como o Admin autoriza a subscrição?

### Painel Admin - Gestão de Pagamentos
1. **Lista de Pagamentos Pendentes**
   - Dados do usuário
   - Método de pagamento
   - Valor
   - Comprovante anexado
   - Data da transação

2. **Processo de Verificação**
   - Admin visualiza comprovante
   - Verifica dados bancários
   - Confirma valor e referência
   - Aprova ou rejeita pagamento

3. **Ações Automáticas pós-aprovação**
   - Atualiza `subscription_status` → `active`
   - Define data de expiração (+30 dias)
   - Envia email de confirmação
   - Registra auditoria

## 5. Como o sistema sabe quando o tempo termina?

### Sistema de Verificação Automática
1. **Job Diário** (cron job):
   - Verifica subscrições que expiram em 3 dias → notificação
   - Verifica subscrições que expiram hoje → último aviso
   - Verifica subscrições expiradas → bloqueio

2. **Middleware de Verificação**:
   - Todas as requisições verificam status da subscrição
   - Bloqueia acesso se expirado
   - Permite apenas páginas de pagamento

### Notificações Automáticas
- **3 dias antes**: "Sua subscrição expira em 3 dias"
- **1 dia antes**: "Sua subscrição expira amanhã"
- **No dia**: "Sua subscrição expirou hoje"
- **7 dias após**: "Reative sua conta - oferta especial"

## 6. Estado Atual vs Necessário

### ❌ Não Implementado Ainda
1. Job automático de verificação de expiração
2. Sistema de notificações por email/SMS
3. Middleware que bloqueia usuários expirados
4. Painel admin para confirmar pagamentos manuais
5. Sistema de upload de comprovantes
6. Cálculo automático de datas de expiração

### ✅ Já Implementado
1. Esquema de banco com todas as tabelas necessárias
2. Métodos de pagamento configurados
3. Sistema de planos
4. Estrutura básica de usuários com trial

## 7. Plano de Implementação

### Fase 1: Sistema de Expiração (Crítico)
- [ ] Middleware de verificação de subscrição
- [ ] Job de verificação automática
- [ ] Sistema de notificações básico
- [ ] Páginas de renovação/upgrade

### Fase 2: Pagamentos Manuais (Essencial)
- [ ] Upload de comprovantes
- [ ] Painel admin para verificação
- [ ] Processo de aprovação/rejeição
- [ ] Ativação automática pós-aprovação

### Fase 3: Automatização Avançada (Melhoria)
- [ ] Integração com APIs dos bancos angolanos
- [ ] Webhook para Multicaixa/Unitel/AfriMoney
- [ ] Relatórios financeiros
- [ ] Análise de conversão

### Fase 4: Melhorias UX (Futuro)
- [ ] Dashboard de status de pagamento
- [ ] Histórico de transações
- [ ] Renovação automática
- [ ] Múltiplos métodos por usuário

## 8. Riscos e Mitigações

### Riscos Identificados
1. **Usuários não pagam após trial**: Sistema de follow-up
2. **Fraudes em transferências**: Verificação manual rigorosa
3. **Falhas na verificação automática**: Logs e alertas
4. **Problemas de comunicação**: Múltiplos canais de notificação

### Mitigações
1. Campanhas de retenção automáticas
2. Processo de verificação em duas etapas
3. Monitoramento 24/7 com alertas
4. Backup de notificações via WhatsApp

## 9. Métricas de Sucesso
- Taxa de conversão trial → paid > 15%
- Tempo médio de aprovação < 24h
- Taxa de renovação > 80%
- Satisfação do cliente > 4.5/5

Esta documentação serve como guia para implementação completa do sistema de pagamentos e subscrições.